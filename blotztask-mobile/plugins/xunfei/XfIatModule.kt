package com.blotz.blotztask.xfyun

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.iflytek.sparkchain.core.SparkChain
import com.iflytek.sparkchain.core.SparkChainConfig
import com.iflytek.sparkchain.core.asr.ASR
import com.iflytek.sparkchain.core.asr.AsrCallbacks
import java.util.concurrent.atomic.AtomicBoolean

/**
 * SparkChain 语音听写（ASR）React Native Bridge
 *
 * JS 侧事件：XfIatEvent
 * - { type: "init" }
 * - { type: "begin" }
 * - { type: "result", text, status, sid, begin, end, isLast }
 * - { type: "error", code, message, sid }
 * - { type: "end" }
 */
class XfIatModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "XfIat"

  private var asr: ASR? = null

  // SparkChain init 只需要一次
  private val sdkInited = AtomicBoolean(false)

  private val isRunning = AtomicBoolean(false)
  private val isWriting = AtomicBoolean(false)

  // AudioRecord
  private var recorder: AudioRecord? = null
  private var recordThread: Thread? = null

  // session tag
  private var sessionCount: Int = 0
  private var currentUsrTag: String = ""

  companion object {
    private const val TAG = "XFYUN_ASR"
    private const val DEFAULT_SAMPLE_RATE = 16000
    private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

    // demo 里 buffer=1280 bytes，约 40ms@16k/mono/16bit
    private const val FRAME_BYTES = 1280
  }

  /** RN EventEmitter 兼容（避免 RN 警告） */
  @ReactMethod
  fun addListener(eventName: String) { /* no-op */ }

  @ReactMethod
  fun removeListeners(count: Int) { /* no-op */ }

  /**
   * ✅ SparkChain 全局初始化（三元组）
   * 必须在 new ASR() / 调用 ASR.start() 之前执行，否则会出现：
   * No implementation found for ... ASR.asrCreate() ... is the library loaded?
   */
  @ReactMethod
  fun initSdk(appId: String, apiKey: String, apiSecret: String, promise: Promise) {
    try {
      if (sdkInited.get()) {
        // 已初始化过，确保 ASR ready 即可
        ensureAsrReady()
        sendEvent("init", null)
        promise.resolve(true)
        return
      }

      val context = reactContext.applicationContext

      
      val config = SparkChainConfig.builder()
        .appID(appId)
        .apiKey(apiKey)
        .apiSecret(apiSecret)
        

      val ret = SparkChain.getInst().init(context, config)
      if (ret != 0) {
        sendError(ret, "SparkChain init failed", "")
        promise.resolve(false)
        return
      }

      sdkInited.set(true)

      // 初始化 ASR
      ensureAsrReady()

      sendEvent("init", null)
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "initSdk failed", t)
      sendError(-1, t.message ?: "initSdk failed", "")
      promise.reject("XFYUN_INIT_SDK_FAILED", t)
    }
  }

  /**
   * init：仅确保 ASR 实例存在（不做三元组）
   * ✅ 如果你已经调用过 initSdk，可调用 init 作为幂等行为
   * ⚠️ 如果你没调用 initSdk，ASR 后续可能仍会报 JNI 错误
   */
  @ReactMethod
  fun init(promise: Promise) {
    try {
      ensureAsrReady()
      sendEvent("init", null)
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "init failed", t)
      sendError(-1, t.message ?: "init failed", "")
      promise.reject("XFYUN_INIT_FAILED", t)
    }
  }

  /**
   * 开始听写（麦克风流式）
   *
   * options：
   * - language: "zh_cn" | "en_us" ...（默认 zh_cn）
   * - domain:   "iat"（默认 iat）
   * - accent:   "mandarin"（默认 mandarin，仅中文生效）
   * - vinfo:    true/false（默认 true）
   * - dwa:      "wpgs"（默认：中文时 wpgs；否则不设置）
   * - sampleRate: 16000（默认 16000）
   */
  @ReactMethod
  fun start(options: ReadableMap, promise: Promise) {
    try {
      if (isRunning.get()) {
        promise.resolve(false)
        return
      }

      // 这里不强制 sdkInited，但强烈建议 JS 先调用 initSdk
      ensureAsrReady()

      val language = if (options.hasKey("language")) options.getString("language") else "zh_cn"
      val domain = if (options.hasKey("domain")) options.getString("domain") else "iat"
      val accent = if (options.hasKey("accent")) options.getString("accent") else "mandarin"
      val vinfo = if (options.hasKey("vinfo")) options.getBoolean("vinfo") else true
      val sampleRate = if (options.hasKey("sampleRate")) options.getInt("sampleRate") else DEFAULT_SAMPLE_RATE

      // 按 demo 设置参数
      asr!!.language(language)
      asr!!.domain(domain)
      asr!!.accent(accent)
      asr!!.vinfo(vinfo)

      // 中文才开动态修正
      if (language == "zh_cn") {
        val dwa = if (options.hasKey("dwa")) options.getString("dwa") else "wpgs"
        if (!dwa.isNullOrBlank()) asr!!.dwa(dwa)
      }

      // 开启会话
      sessionCount += 1
      currentUsrTag = sessionCount.toString()

      val ret = asr!!.start(currentUsrTag)
      if (ret != 0) {
        sendError(ret, "ASR start failed", "")
        isRunning.set(false)
        isWriting.set(false)
        promise.resolve(false)
        return
      }

      isRunning.set(true)
      isWriting.set(true)

      sendEvent("begin", null)

      // 启动录音线程，持续 write 到 SDK
      startAudioRecord(sampleRate)

      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "start failed", t)
      isRunning.set(false)
      isWriting.set(false)
      stopAudioRecord()
      sendError(-1, t.message ?: "start failed", "")
      promise.reject("XFYUN_START_FAILED", t)
    }
  }

  /**
   * 停止听写
   * - immediate: true/false（默认 false）
   *
   * demo：
   * - stop(false)：等云端最后一包下发后结束（推荐）
   * - stop(true)：立即结束/取消
   */
  @ReactMethod
  fun stop(immediate: Boolean, promise: Promise) {
    try {
      if (!isRunning.get()) {
        promise.resolve(true)
        return
      }

      // 先停止录音写入
      isWriting.set(false)
      stopAudioRecord()

      // 通知 SDK stop
      asr?.stop(immediate)

      // ⚠️ 不在这里 emit end：最终结束由 onResult(status==2) 或 onError 触发
      // 这样避免 end 重复 & 状态更准确（final result 到来后结束）
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "stop failed", t)
      isRunning.set(false)
      isWriting.set(false)
      stopAudioRecord()
      sendError(-1, t.message ?: "stop failed", "")
      promise.reject("XFYUN_STOP_FAILED", t)
    }
  }

  /**
   * 可选：取消（立即终止）
   */
  @ReactMethod
  fun cancel(promise: Promise) {
    try {
      if (!isRunning.get()) {
        promise.resolve(true)
        return
      }
      isWriting.set(false)
      stopAudioRecord()
      asr?.stop(true)
      // 取消也认为结束
      isRunning.set(false)
      sendEvent("end", null)
      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "cancel failed", t)
      isRunning.set(false)
      isWriting.set(false)
      stopAudioRecord()
      sendError(-1, t.message ?: "cancel failed", "")
      promise.reject("XFYUN_CANCEL_FAILED", t)
    }
  }

  // -----------------------------
  // AsrCallbacks（参考 demo）
  // -----------------------------

  private val callbacks = object : AsrCallbacks {
    override fun onResult(asrResult: ASR.ASRResult, usrTag: Any?) {
      try {
        val begin = asrResult.begin
        val end = asrResult.end
        val status = asrResult.status // 0/1/2
        val text = asrResult.bestMatchText ?: ""
        val sid = asrResult.sid ?: ""

        val payload = Arguments.createMap().apply {
          putString("text", text)
          putInt("status", status)
          putString("sid", sid)
          putInt("begin", begin)
          putInt("end", end)
          putBoolean("isLast", status == 2)
        }
        sendEvent("result", payload)

        // status==2：最终结果
        if (status == 2) {
          isWriting.set(false)
          stopAudioRecord()
          isRunning.set(false)
          sendEvent("end", null)
        }
      } catch (t: Throwable) {
        Log.e(TAG, "onResult parse failed", t)
        sendError(-1, t.message ?: "onResult parse failed", "")
      }
    }

    override fun onError(asrError: ASR.ASRError, usrTag: Any?) {
      val code = asrError.code
      val msg = asrError.errMsg ?: "ASR error"
      val sid = asrError.sid ?: ""

      Log.e(TAG, "ASR error code=$code msg=$msg sid=$sid")

      isWriting.set(false)
      stopAudioRecord()
      isRunning.set(false)

      sendError(code, msg, sid)
      sendEvent("end", null)
    }

    override fun onBeginOfSpeech() {
      // 可选：你也可以 emit 一个事件给 JS
    }

    override fun onEndOfSpeech() {
      // 可选
    }
  }

  // -----------------------------
  // AudioRecord → asr.write(data)
  // -----------------------------

    private fun startAudioRecord(sampleRate: Int) {
    stopAudioRecord()

    val minBuf = AudioRecord.getMinBufferSize(sampleRate, CHANNEL_CONFIG, AUDIO_FORMAT)
    val bufferSize = maxOf(minBuf, FRAME_BYTES * 8) // 给大一点更稳

    recorder = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION, // ✅ 更适合 ASR
      sampleRate,
      CHANNEL_CONFIG,
      AUDIO_FORMAT,
      bufferSize
    )

    if (recorder?.state != AudioRecord.STATE_INITIALIZED) {
      Log.e(TAG, "AudioRecord not initialized, state=${recorder?.state}")
      sendError(-2, "AudioRecord not initialized", "")
      isWriting.set(false)
      return
    }

    recorder?.startRecording()

    recordThread = Thread {
      val buffer = ByteArray(FRAME_BYTES) // ✅ 固定 1280
      Log.d(TAG, "record thread started, sampleRate=$sampleRate")

      while (isWriting.get() && isRunning.get()) {
        val r = recorder?.read(buffer, 0, buffer.size) ?: -1
        Log.d(TAG, "read=$r")

        if (r == FRAME_BYTES) {
          val ret = asr?.write(buffer.clone()) ?: -1
          Log.d(TAG, "write ret=$ret")

          if (ret != 0) {
            Log.e(TAG, "asr.write failed ret=$ret")
            isWriting.set(false)
            break
          }

          // ✅ 复刻 demo：40ms
          try { Thread.sleep(40) } catch (_: Throwable) {}

        } else if (r > 0) {
          // 不是完整帧：跳过（比补齐更稳）
          Log.w(TAG, "skip partial frame r=$r")
          try { Thread.sleep(10) } catch (_: Throwable) {}

        } else {
          // r<=0：录音没数据 or 出错
          Log.w(TAG, "audio read failed r=$r")
          try { Thread.sleep(20) } catch (_: Throwable) {}
        }
      }

      Log.d(TAG, "record thread exiting")
    }.apply {
      name = "XFYUN_ASR_RECORD"
      isDaemon = true
    }

    recordThread?.start()
  }

  private fun stopAudioRecord() {
    try {
      recorder?.stop()
    } catch (_: Throwable) {}

    try {
      recorder?.release()
    } catch (_: Throwable) {}

    recorder = null

    try {
      recordThread?.join(200)
    } catch (_: Throwable) {}

    recordThread = null
  }


  private fun ensureAsrReady() {
    if (asr == null) {
      asr = ASR()
      asr!!.registerCallbacks(callbacks)
    }
  }

  // -----------------------------
  // Event helpers
  // -----------------------------

  private fun sendEvent(type: String, payload: WritableMap?) {
    val map = payload ?: Arguments.createMap()
    map.putString("type", type)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("XfIatEvent", map)
  }

  private fun sendError(code: Int, message: String, sid: String) {
    val map = Arguments.createMap().apply {
      putInt("code", code)
      putString("message", message)
      putString("sid", sid)
    }
    sendEvent("error", map)
  }
}
