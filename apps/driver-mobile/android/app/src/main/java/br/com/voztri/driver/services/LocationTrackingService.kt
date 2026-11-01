package br.com.voztri.driver.services

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import br.com.voztri.driver.MainActivity
import br.com.voztri.driver.R
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Serviço em primeiro plano (tipo "location") que envia a posição do motorista
 * para POST /driver/location enquanto ele está online, inclusive com o app em
 * segundo plano ou com a tela desligada.
 *
 * O envio é feito aqui, em Kotlin, e não no JavaScript: em segundo plano a
 * thread JS pode ser suspensa pelo sistema. Mesmas regras do app: no máximo um
 * envio a cada [EXTRA_INTERVAL_MS], a não ser que o motorista ande mais do que
 * [EXTRA_DISTANCE_M]. Para sozinho se a API responder 401/403/404.
 */
class LocationTrackingService : Service() {

  companion object {
    const val EXTRA_API_URL = "apiUrl"
    const val EXTRA_TOKEN = "token"
    const val EXTRA_INTERVAL_MS = "intervalMs"
    const val EXTRA_DISTANCE_M = "distanceM"
    const val EXTRA_FILTER_M = "distanceFilterM"

    private const val TAG = "VoztriTracking"
    private const val CHANNEL_ID = "voztri_location_tracking"
    private const val NOTIFICATION_ID = 4101

    /** Estado consultado pelo módulo React Native (mesmo processo). */
    @Volatile
    var isRunning: Boolean = false
      private set

    /** Status HTTP do último envio (diagnóstico; 0 = ainda não enviou ou falha de rede). */
    @Volatile
    var lastHttpStatus: Int = 0
      private set
  }

  private lateinit var fused: FusedLocationProviderClient
  private val network: ExecutorService = Executors.newSingleThreadExecutor()
  private val mainHandler = Handler(Looper.getMainLooper())

  private var apiUrl: String = ""
  private var token: String = ""
  private var intervalMs: Long = 10_000
  private var distanceM: Float = 200f
  private var filterM: Float = 25f

  private var lastSentAt: Long = 0
  private var lastSentLocation: Location? = null
  private var updatesRequested = false

  private val callback =
      object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
          result.lastLocation?.let { maybeSend(it) }
        }
      }

  override fun onCreate() {
    super.onCreate()
    fused = LocationServices.getFusedLocationProviderClient(this)
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val url = intent?.getStringExtra(EXTRA_API_URL)
    val tok = intent?.getStringExtra(EXTRA_TOKEN)
    if (url.isNullOrBlank() || tok.isNullOrBlank()) {
      Log.w(TAG, "Sem URL da API ou token; encerrando o rastreamento")
      shutdown()
      return START_NOT_STICKY
    }

    apiUrl = url.trimEnd('/')
    token = tok
    intervalMs = intent.getDoubleExtra(EXTRA_INTERVAL_MS, 10_000.0).toLong()
    distanceM = intent.getDoubleExtra(EXTRA_DISTANCE_M, 200.0).toFloat()
    filterM = intent.getDoubleExtra(EXTRA_FILTER_M, 25.0).toFloat()

    if (!hasLocationPermission() || !enterForeground()) {
      shutdown()
      return START_NOT_STICKY
    }

    requestUpdates()
    isRunning = true
    // Se o sistema matar o processo, recria o serviço com o mesmo intent (URL + token)
    return START_REDELIVER_INTENT
  }

  override fun onDestroy() {
    stopUpdates()
    isRunning = false
    network.shutdownNow()
    super.onDestroy()
  }

  // ------------------------------------------------------------ notificação

  private fun enterForeground(): Boolean {
    createChannel()

    val openApp =
        PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    val notification: Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_location)
            .setContentTitle(getString(R.string.tracking_notification_title))
            .setContentText(getString(R.string.tracking_notification_text))
            .setContentIntent(openApp)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()

    return try {
      // Android 10+ exige declarar o tipo (location); o androidx.core do RN 0.74 não tem a versão com tipo
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      true
    } catch (e: Exception) {
      // Android 12+: início em segundo plano não permitido; Android 14+: sem permissão de localização
      Log.e(TAG, "Não foi possível entrar em primeiro plano", e)
      false
    }
  }

  private fun createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel =
        NotificationChannel(
            CHANNEL_ID,
            getString(R.string.tracking_channel_name),
            NotificationManager.IMPORTANCE_LOW,
        )
    channel.description = getString(R.string.tracking_channel_description)
    channel.setShowBadge(false)
    manager.createNotificationChannel(channel)
  }

  // ------------------------------------------------------------ localização

  private fun hasLocationPermission(): Boolean =
      ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
          ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

  private fun requestUpdates() {
    if (updatesRequested) fused.removeLocationUpdates(callback)
    val request =
        LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs / 2)
            .setMinUpdateIntervalMillis(intervalMs / 4)
            .setMinUpdateDistanceMeters(filterM)
            .build()
    try {
      fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
      updatesRequested = true
    } catch (e: SecurityException) {
      Log.e(TAG, "Permissão de localização revogada", e)
      shutdown()
    }
  }

  private fun stopUpdates() {
    if (updatesRequested) {
      fused.removeLocationUpdates(callback)
      updatesRequested = false
    }
  }

  private fun maybeSend(location: Location) {
    val now = System.currentTimeMillis()
    val previous = lastSentLocation
    val due = previous == null || now - lastSentAt >= intervalMs || location.distanceTo(previous) >= distanceM
    if (!due) return

    lastSentAt = now
    lastSentLocation = location
    val body = JSONObject()
    body.put("latitude", location.latitude)
    body.put("longitude", location.longitude)
    // A API recusa valores fora da faixa; desconhecidos são omitidos
    if (location.hasBearing() && location.bearing in 0f..360f) body.put("heading", location.bearing.toDouble())
    if (location.hasSpeed() && location.speed >= 0f) body.put("speed", location.speed.toDouble())

    network.execute { post(body) }
  }

  private fun post(body: JSONObject) {
    var connection: HttpURLConnection? = null
    try {
      connection = (URL("$apiUrl/driver/location").openConnection() as HttpURLConnection).apply {
        requestMethod = "POST"
        connectTimeout = 10_000
        readTimeout = 10_000
        doOutput = true
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Accept", "application/json")
        setRequestProperty("Authorization", "Bearer $token")
      }
      connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
      val status = connection.responseCode
      lastHttpStatus = status

      when {
        status in 200..299 -> Unit
        // Sessão expirada, motorista removido ou usuário que não é motorista: não insistir
        status == 401 || status == 403 || status == 404 -> {
          Log.w(TAG, "API respondeu $status; encerrando o rastreamento")
          mainHandler.post { shutdown() }
        }
        else -> retryOnNextFix()
      }
    } catch (e: Exception) {
      lastHttpStatus = 0
      Log.w(TAG, "Falha ao enviar a posição: ${e.message}")
      retryOnNextFix()
    } finally {
      connection?.disconnect()
    }
  }

  /** Falha temporária: a próxima leitura do GPS envia de novo. */
  private fun retryOnNextFix() {
    mainHandler.post { lastSentLocation = null }
  }

  private fun shutdown() {
    stopUpdates()
    isRunning = false
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }
}
