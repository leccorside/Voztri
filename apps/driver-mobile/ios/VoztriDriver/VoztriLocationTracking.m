// Rastreamento do motorista com o app em segundo plano no iOS: o equivalente ao
// LocationTrackingService do Android, exposto ao JS como
// NativeModules.VoztriLocationTracking (start / stop / status), com a mesma API.
//
// Por que um CLLocationManager próprio (e não o da @react-native-community/geolocation):
// a biblioteca não expõe pausesLocationUpdatesAutomatically (padrão YES) nem
// activityType, e o iOS suspende as atualizações depois de um tempo com o
// motorista parado, justamente quando ele está esperando no embarque. Aqui:
//   - pausesLocationUpdatesAutomatically = NO: o GPS nunca é pausado pelo sistema;
//   - activityType = CLActivityTypeAutomotiveNavigation: perfil de motorista em rota;
//   - distanceFilter = kCLDistanceFilterNone: continua recebendo leituras com o
//     carro parado (com filtro de distância, parado não chega leitura nenhuma);
//   - envio direto para /driver/location (NSURLSession), sem depender do JS, com as
//     mesmas regras do Android: no máximo a cada intervalMs, ou na hora ao andar
//     distanceM; a leitura segurada pelo intervalo é enviada quando ele vence.
// A chegada automática ao embarque (distância + precisão <= 100 m) depende disso.

#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

#pragma mark - Rastreador (um por processo)

@interface VoztriLocationTracker : NSObject <CLLocationManagerDelegate>
@property (nonatomic, readonly) BOOL running;
@property (atomic, readonly) NSInteger lastHttpStatus;
+ (instancetype)shared;
/** Inicia (ou reconfigura). Devolve o código de erro, ou nil se iniciou. Só na main thread. */
- (nullable NSString *)startWithApiUrl:(NSString *)apiUrl
                                 token:(NSString *)token
                            intervalMs:(double)intervalMs
                             distanceM:(double)distanceM;
- (void)stop;
@end

@implementation VoztriLocationTracker {
  CLLocationManager *_manager;
  NSURLSession *_session;
  NSString *_apiUrl;
  NSString *_token;
  NSTimeInterval _interval;
  CLLocationDistance _distance;
  CLLocation *_lastSent;
  NSDate *_lastSentAt;
  CLLocation *_pending;
  NSTimer *_trailingTimer;
}

+ (instancetype)shared
{
  static VoztriLocationTracker *instance;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    instance = [VoztriLocationTracker new];
  });
  return instance;
}

- (instancetype)init
{
  if ((self = [super init])) {
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
    config.timeoutIntervalForRequest = 10;
    config.timeoutIntervalForResource = 20;
    _session = [NSURLSession sessionWithConfiguration:config];
  }
  return self;
}

- (CLAuthorizationStatus)authorizationStatus
{
  if (@available(iOS 14.0, *)) {
    return _manager.authorizationStatus;
  }
  return [CLLocationManager authorizationStatus];
}

/** allowsBackgroundLocationUpdates = YES sem o modo "location" no Info.plist derruba o app. */
+ (BOOL)hasLocationBackgroundMode
{
  NSArray *modes = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"UIBackgroundModes"];
  return [modes isKindOfClass:[NSArray class]] && [modes containsObject:@"location"];
}

- (nullable NSString *)startWithApiUrl:(NSString *)apiUrl
                                 token:(NSString *)token
                            intervalMs:(double)intervalMs
                             distanceM:(double)distanceM
{
  if (!_manager) {
    _manager = [CLLocationManager new];
    _manager.delegate = self;
  }

  if (![CLLocationManager locationServicesEnabled]) {
    return @"LOCATION_DISABLED";
  }
  CLAuthorizationStatus status = [self authorizationStatus];
  // "Durante o uso" basta: iniciado com o app aberto e com allowsBackgroundLocationUpdates,
  // o iOS mantém as atualizações em segundo plano (com o indicador azul).
  if (status != kCLAuthorizationStatusAuthorizedAlways && status != kCLAuthorizationStatusAuthorizedWhenInUse) {
    return @"PERMISSION_DENIED";
  }

  while ([apiUrl hasSuffix:@"/"]) {
    apiUrl = [apiUrl substringToIndex:apiUrl.length - 1];
  }
  _apiUrl = apiUrl;
  _token = token;
  _interval = MAX(1.0, intervalMs / 1000.0);
  _distance = MAX(1.0, distanceM);
  _lastSent = nil;
  _lastSentAt = nil;
  [self cancelTrailing];

  _manager.desiredAccuracy = kCLLocationAccuracyBest;
  _manager.distanceFilter = kCLDistanceFilterNone;
  _manager.activityType = CLActivityTypeAutomotiveNavigation;
  _manager.pausesLocationUpdatesAutomatically = NO;
  if ([VoztriLocationTracker hasLocationBackgroundMode]) {
    _manager.allowsBackgroundLocationUpdates = YES;
    if (@available(iOS 11.0, *)) {
      _manager.showsBackgroundLocationIndicator = YES;
    }
  }

  [_manager startUpdatingLocation];
  _running = YES;
  return nil;
}

- (void)stop
{
  _running = NO;
  [self cancelTrailing];
  _pending = nil;
  if (_manager) {
    [_manager stopUpdatingLocation];
    if ([VoztriLocationTracker hasLocationBackgroundMode]) {
      _manager.allowsBackgroundLocationUpdates = NO;
    }
  }
}

#pragma mark CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  // horizontalAccuracy negativo = leitura inválida
  if (!_running || !location || location.horizontalAccuracy < 0) return;
  [self maybeSend:location];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  // Permissão retirada pelo usuário: não há o que rastrear (erros temporários são ignorados)
  if ([error.domain isEqualToString:kCLErrorDomain] && error.code == kCLErrorDenied) {
    [self stop];
  }
}

- (void)handleAuthorizationChange
{
  CLAuthorizationStatus status = [self authorizationStatus];
  if (_running && (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted)) {
    [self stop];
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager API_AVAILABLE(ios(14.0))
{
  [self handleAuthorizationChange];
}

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status
{
  [self handleAuthorizationChange];
}

#pragma mark Envio

- (void)maybeSend:(CLLocation *)location
{
  NSDate *now = [NSDate date];
  NSTimeInterval elapsed = _lastSentAt ? [now timeIntervalSinceDate:_lastSentAt] : DBL_MAX;
  BOOL due = !_lastSent || elapsed >= _interval || [location distanceFromLocation:_lastSent] >= _distance;

  if (!due) {
    // Segura a leitura mais recente e envia quando o intervalo vencer: a última
    // posição antes de o motorista parar nunca fica sem chegar à API.
    _pending = location;
    if (!_trailingTimer) {
      __weak VoztriLocationTracker *weakSelf = self;
      _trailingTimer = [NSTimer scheduledTimerWithTimeInterval:MAX(0.5, _interval - elapsed)
                                                       repeats:NO
                                                         block:^(NSTimer *timer) {
                                                           [weakSelf flushPending];
                                                         }];
    }
    return;
  }

  [self cancelTrailing];
  _pending = nil;
  _lastSent = location;
  _lastSentAt = now;
  [self post:[self bodyFor:location]];
}

- (void)flushPending
{
  _trailingTimer = nil;
  CLLocation *pending = _pending;
  _pending = nil;
  if (_running && pending) [self maybeSend:pending];
}

- (void)cancelTrailing
{
  [_trailingTimer invalidate];
  _trailingTimer = nil;
}

- (NSDictionary *)bodyFor:(CLLocation *)location
{
  NSMutableDictionary *body = [@{
    @"latitude" : @(location.coordinate.latitude),
    @"longitude" : @(location.coordinate.longitude),
    // Raio de incerteza (m): a API só marca a chegada se distância + precisão couber em 100 m
    @"accuracy" : @(location.horizontalAccuracy),
  } mutableCopy];
  // A API recusa valores fora da faixa; o iOS usa -1 para desconhecido
  if (location.course >= 0 && location.course <= 360) body[@"heading"] = @(location.course);
  if (location.speed >= 0) body[@"speed"] = @(location.speed);
  return body;
}

- (void)post:(NSDictionary *)body
{
  NSURL *url = [NSURL URLWithString:[_apiUrl stringByAppendingString:@"/driver/location"]];
  NSData *json = [NSJSONSerialization dataWithJSONObject:body options:0 error:nil];
  if (!url || !json) return;

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = @"POST";
  request.HTTPBody = json;
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [request setValue:[@"Bearer " stringByAppendingString:_token] forHTTPHeaderField:@"Authorization"];

  // Tempo extra para a requisição terminar se o app for para o segundo plano no meio dela
  UIApplication *app = [UIApplication sharedApplication];
  __block UIBackgroundTaskIdentifier task = [app beginBackgroundTaskWithName:@"VoztriLocationPost"
                                                           expirationHandler:^{
                                                             [app endBackgroundTask:task];
                                                             task = UIBackgroundTaskInvalid;
                                                           }];

  __weak VoztriLocationTracker *weakSelf = self;
  [[_session dataTaskWithRequest:request
               completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
                 NSInteger status = [response isKindOfClass:[NSHTTPURLResponse class]]
                     ? ((NSHTTPURLResponse *)response).statusCode
                     : 0;
                 dispatch_async(dispatch_get_main_queue(), ^{
                   [weakSelf handleResponseStatus:error ? 0 : status];
                   if (task != UIBackgroundTaskInvalid) {
                     [app endBackgroundTask:task];
                     task = UIBackgroundTaskInvalid;
                   }
                 });
               }] resume];
}

- (void)handleResponseStatus:(NSInteger)status
{
  _lastHttpStatus = status;
  if (status >= 200 && status < 300) return;
  if (status == 401 || status == 403 || status == 404) {
    // Sessão expirada, motorista removido ou usuário que não é motorista: não insistir
    NSLog(@"[VoztriLocationTracking] API respondeu %ld; encerrando o rastreamento", (long)status);
    [self stop];
    return;
  }
  // Falha temporária (rede, 5xx): a próxima leitura envia de novo
  _lastSent = nil;
}

@end

#pragma mark - Módulo React Native

@interface VoztriLocationTracking : NSObject <RCTBridgeModule>
@end

@implementation VoztriLocationTracking

RCT_EXPORT_MODULE(VoztriLocationTracking)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

// CLLocationManager precisa ser criado e usado numa thread com run loop: a main
- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

static double numberOr(NSDictionary *config, NSString *key, double fallback)
{
  id value = config[key];
  return [value isKindOfClass:[NSNumber class]] ? [value doubleValue] : fallback;
}

RCT_EXPORT_METHOD(start:(NSDictionary *)config resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
{
  NSString *apiUrl = [config[@"apiUrl"] isKindOfClass:[NSString class]] ? config[@"apiUrl"] : nil;
  NSString *token = [config[@"token"] isKindOfClass:[NSString class]] ? config[@"token"] : nil;
  if (apiUrl.length == 0 || token.length == 0) {
    reject(@"INVALID_CONFIG", @"apiUrl e token são obrigatórios", nil);
    return;
  }

  NSString *errorCode = [[VoztriLocationTracker shared] startWithApiUrl:apiUrl
                                                                  token:token
                                                             intervalMs:numberOr(config, @"intervalMs", 10000)
                                                              distanceM:numberOr(config, @"distanceM", 200)];
  if (errorCode) {
    reject(errorCode, @"Não foi possível iniciar o rastreamento em segundo plano", nil);
    return;
  }
  resolve(@YES);
}

RCT_EXPORT_METHOD(stop:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
{
  [[VoztriLocationTracker shared] stop];
  resolve(@YES);
}

RCT_EXPORT_METHOD(status:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject)
{
  VoztriLocationTracker *tracker = [VoztriLocationTracker shared];
  resolve(@{@"running" : @(tracker.running), @"lastHttpStatus" : @(tracker.lastHttpStatus)});
}

@end
