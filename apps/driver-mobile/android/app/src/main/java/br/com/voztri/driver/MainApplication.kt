package br.com.voztri.driver

import android.app.Application
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import br.com.voztri.driver.services.LocationTrackingPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Módulo nativo do app (não autolinkado): rastreamento em segundo plano
              add(LocationTrackingPackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
    createOfferNotificationChannel()
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }

  /**
   * Canal das notificações push de nova corrida (id "ride_offers", usado pelo backend e
   * pelo firebase.json). Importância alta para aparecer como alerta com som mesmo com o
   * app em segundo plano. Criar de novo um canal existente não altera as preferências
   * que o motorista já ajustou.
   */
  private fun createOfferNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
        OFFERS_CHANNEL_ID,
        getString(R.string.offers_channel_name),
        NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = getString(R.string.offers_channel_description)
      enableVibration(true)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  companion object {
    const val OFFERS_CHANNEL_ID = "ride_offers"
  }
}
