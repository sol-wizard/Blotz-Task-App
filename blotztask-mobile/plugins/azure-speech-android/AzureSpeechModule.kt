package com.blotz.blotztask.azurespeech

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.microsoft.cognitiveservices.speech.*
import com.microsoft.cognitiveservices.speech.audio.AudioConfig

class AzureSpeechModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  private var recognizer: SpeechRecognizer? = null

  override fun getName(): String = "AzureSpeech"

  private fun emit(name: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, params)
  }

  @ReactMethod
  fun startListen(token: String, region: String, language: String, promise: Promise) {
    try {
      stopInternal()

      val speechConfig = SpeechConfig.fromAuthorizationToken(token, region)
      speechConfig.speechRecognitionLanguage = language

      val audioConfig = AudioConfig.fromDefaultMicrophoneInput()
      val r = SpeechRecognizer(speechConfig, audioConfig)
      recognizer = r

      r.recognizing.addEventListener { _, e ->
        val map = Arguments.createMap()
        map.putString("text", e.result.text ?: "")
        emit("AzureSpeechRecognizing", map) // partial
      }

      r.recognized.addEventListener { _, e ->
        val map = Arguments.createMap()
        map.putString("text", e.result.text ?: "")
        emit("AzureSpeechRecognized", map) // final
      }

      r.canceled.addEventListener { _, e ->
        val map = Arguments.createMap()
        map.putString("reason", e.reason.toString())
        map.putString("errorCode", e.errorCode.toString())
        map.putString("errorDetails", e.errorDetails ?: "")
        emit("AzureSpeechCanceled", map)
      }

      r.startContinuousRecognitionAsync()
      promise.resolve(true)
    } catch (ex: Exception) {
      promise.reject("AZURE_SPEECH_START_FAILED", ex.message, ex)
    }
  }

  @ReactMethod
  fun stopListen(promise: Promise) {
    try {
      stopInternal()
      promise.resolve(true)
    } catch (ex: Exception) {
      promise.reject("AZURE_SPEECH_STOP_FAILED", ex.message, ex)
    }
  }

  private fun stopInternal() {
    try { recognizer?.stopContinuousRecognitionAsync() } catch (_: Exception) {}
    try { recognizer?.close() } catch (_: Exception) {}
    recognizer = null
  }
}
