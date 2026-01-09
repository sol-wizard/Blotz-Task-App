package com.blotz.blotztask.xfyun

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class XfIatModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "XfIat"

  @ReactMethod
  fun init(appId: String, promise: Promise) {
    // TODO: 在这里初始化 SparkChain（用你 SDK 的初始化方法）
    sendEvent("init", Arguments.createMap().apply { putString("appId", appId) })
    promise.resolve(true)
  }

  @ReactMethod
  fun start(options: ReadableMap, promise: Promise) {
    // TODO: start listening
    sendEvent("begin", null)
    promise.resolve(true)
  }

  @ReactMethod
  fun stop() {
    // TODO: stop listening
    sendEvent("end", null)
  }

  private fun sendEvent(type: String, payload: WritableMap?) {
    val map = payload ?: Arguments.createMap()
    map.putString("type", type)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("XfIatEvent", map)
  }
}
