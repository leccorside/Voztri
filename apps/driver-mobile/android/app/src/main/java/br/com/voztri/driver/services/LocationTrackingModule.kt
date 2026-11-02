package br.com.voztri.driver.services

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/** Ponte JS ↔ [LocationTrackingService]: NativeModules.VoztriLocationTracking. */
class LocationTrackingModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

  override fun getName(): String = "VoztriLocationTracking"

  /**
   * Inicia (ou reconfigura) o serviço. Deve ser chamado com o app em primeiro
   * plano: o Android 12+ não permite iniciar serviço em primeiro plano a partir
   * do segundo plano.
   */
  @ReactMethod
  fun start(config: ReadableMap, promise: Promise) {
    val apiUrl = config.getString("apiUrl")
    val token = config.getString("token")
    if (apiUrl.isNullOrBlank() || token.isNullOrBlank()) {
      promise.reject("INVALID_CONFIG", "apiUrl e token são obrigatórios")
      return
    }

    val intent =
        Intent(context, LocationTrackingService::class.java).apply {
          putExtra(LocationTrackingService.EXTRA_API_URL, apiUrl)
          putExtra(LocationTrackingService.EXTRA_TOKEN, token)
          putExtra(LocationTrackingService.EXTRA_INTERVAL_MS, number(config, "intervalMs", 10_000.0))
          putExtra(LocationTrackingService.EXTRA_DISTANCE_M, number(config, "distanceM", 200.0))
          putExtra(LocationTrackingService.EXTRA_FILTER_M, number(config, "distanceFilterM", 25.0))
          putExtra(LocationTrackingService.EXTRA_HEARTBEAT_MS, number(config, "heartbeatMs", 120_000.0))
        }

    try {
      ContextCompat.startForegroundService(context, intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    context.stopService(Intent(context, LocationTrackingService::class.java))
    promise.resolve(true)
  }

  @ReactMethod
  fun status(promise: Promise) {
    val result = com.facebook.react.bridge.Arguments.createMap()
    result.putBoolean("running", LocationTrackingService.isRunning)
    result.putInt("lastHttpStatus", LocationTrackingService.lastHttpStatus)
    promise.resolve(result)
  }

  private fun number(config: ReadableMap, key: String, fallback: Double): Double =
      if (config.hasKey(key) && !config.isNull(key)) config.getDouble(key) else fallback
}
