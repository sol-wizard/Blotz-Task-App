package com.blotz.blotztask.azurespeech

import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.microsoft.cognitiveservices.speech.*
import com.microsoft.cognitiveservices.speech.audio.AudioConfig
import java.util.concurrent.atomic.AtomicBoolean

class AzureSpeechModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  private var recognizer: SpeechRecognizer? = null
  private val isStopping = AtomicBoolean(false)
  private val isStarting = AtomicBoolean(false)

  override fun getName(): String = "AzureSpeech"

  private fun emit(name: String, params: WritableMap?) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(name, params)
  }

  private fun emitDebug(message: String, sessionId: String? = null) {
    Log.i("AzureSpeech", message)
    val map = Arguments.createMap()
    map.putString("message", message)
    map.putString("sessionId", sessionId ?: "")
    emit("AzureSpeechDebug", map)
  }

  
  private fun stopInternal(reason: String) {
    if (isStopping.getAndSet(true)) {
      emitDebug("stopInternal ignored (already stopping). reason=$reason")
      return
    }

    val r = recognizer
    recognizer = null

    try {
      if (r != null) {
        emitDebug("stopInternal begin. reason=$reason")
        try {
          r.stopContinuousRecognitionAsync().get()
          emitDebug("stopContinuousRecognitionAsync finished. reason=$reason")
        } catch (e: Exception) {
          emitDebug("stopContinuousRecognitionAsync failed: ${e.message}. reason=$reason")
        }

        try {
          r.close()
          emitDebug("recognizer.close finished. reason=$reason")
        } catch (e: Exception) {
          emitDebug("recognizer.close failed: ${e.message}. reason=$reason")
        }
      }
    } finally {
      isStopping.set(false)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required for RN built-in EventEmitter
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required for RN built-in EventEmitter
  }


  @ReactMethod
  fun startListen(token: String, region: String, language: String, promise: Promise) {
    if (isStarting.getAndSet(true)) {
      promise.reject("AZURE_SPEECH_START_IN_PROGRESS", "startListen is already in progress")
      return
    }

    try {
      stopInternal("startListen")

      emitDebug("startListen called. lang=$language region=$region tokenLen=${token.length}")

      val speechConfig = SpeechConfig.fromAuthorizationToken(token, region)
      speechConfig.speechRecognitionLanguage = language

      val audioConfig = AudioConfig.fromDefaultMicrophoneInput()
      val r = SpeechRecognizer(speechConfig, audioConfig)
      recognizer = r

      // --- session lifecycle (very important for your "stops mid-way" issue) ---
      r.sessionStarted.addEventListener { _, e ->
        emitDebug("sessionStarted. sessionId=${e.sessionId}", e.sessionId)
        val map = Arguments.createMap()
        map.putString("sessionId", e.sessionId)
        emit("AzureSpeechSessionStarted", map)
      }

      r.sessionStopped.addEventListener { _, e ->
        emitDebug("sessionStopped. sessionId=${e.sessionId}", e.sessionId)
        val map = Arguments.createMap()
        map.putString("sessionId", e.sessionId)
        emit("AzureSpeechSessionStopped", map)

        val stopped = Arguments.createMap()
        stopped.putString("reason", "sessionStopped")
        stopped.putString("sessionId", e.sessionId)
        emit("AzureSpeechStopped", stopped)
      }

      // --- partial ---
      r.recognizing.addEventListener { _, e ->
        val text = e.result.text ?: ""
        Log.d("AzureSpeech", "recognizing: $text")
        val map = Arguments.createMap()
        map.putString("text", text)
        map.putString("sessionId", e.sessionId ?: "")
        emit("AzureSpeechRecognizing", map)
      }

      // --- final ---
      r.recognized.addEventListener { _, e ->
        val reason = e.result.reason
        val text = e.result.text ?: ""
        Log.d("AzureSpeech", "recognized reason=$reason text=$text")

        if (reason == ResultReason.RecognizedSpeech) {
          val map = Arguments.createMap()
          map.putString("text", text)
          map.putString("sessionId", e.sessionId ?: "")
          emit("AzureSpeechRecognized", map)
        } else if (reason == ResultReason.NoMatch) {
          val map = Arguments.createMap()
          map.putString("reason", "NoMatch")
          map.putString("sessionId", e.sessionId ?: "")
          emit("AzureSpeechNoMatch", map)
        }
      }

      // --- canceled (this is where token/network/quota shows up) ---
      r.canceled.addEventListener { _, e ->
        val map = Arguments.createMap()
        map.putString("reason", e.reason.toString())
        map.putString("errorCode", e.errorCode.toString())
        map.putString("errorDetails", e.errorDetails ?: "")
        map.putString("sessionId", e.sessionId ?: "")
        Log.e("AzureSpeech", "canceled reason=${e.reason} code=${e.errorCode} details=${e.errorDetails}")
        emit("AzureSpeechCanceled", map)

        val stopped = Arguments.createMap()
        stopped.putString("reason", "canceled")
        stopped.putString("sessionId", e.sessionId ?: "")
        emit("AzureSpeechStopped", stopped)
      }

      try {
        r.startContinuousRecognitionAsync().get()
        emitDebug("startContinuousRecognitionAsync finished")
      } catch (e: Exception) {
        emitDebug("startContinuousRecognitionAsync failed: ${e.message}")
        throw e
      }

      promise.resolve(true)
    } catch (ex: Exception) {
      promise.reject("AZURE_SPEECH_START_FAILED", ex.message, ex)
    } finally {
      isStarting.set(false)
    }
  }

  @ReactMethod
  fun stopListen(promise: Promise) {
    try {
      stopInternal("stopListen")
      val map = Arguments.createMap()
      map.putString("reason", "stopListen")
      emit("AzureSpeechStopped", map)

      promise.resolve(true)
    } catch (ex: Exception) {
      promise.reject("AZURE_SPEECH_STOP_FAILED", ex.message, ex)
    }
  }

  @ReactMethod
  fun getState(promise: Promise) {
    val map = Arguments.createMap()
    map.putBoolean("hasRecognizer", recognizer != null)
    map.putBoolean("isStopping", isStopping.get())
    map.putBoolean("isStarting", isStarting.get())
    promise.resolve(map)
  }
}
