// import { MODULE_NAME } from "./utils/constants.js";
import { deviceInfoToObject } from "./utils/helpers.js";
import * as log from "./utils/logging.js";

import SimplePeerClient from "./SimplePeerClient.js";

/**
 * An AVClient implementation that uses WebRTC and the simple-peer library.
 * @extends {AVClient}
 * @param {AVMaster} master           The master orchestration instance
 * @param {AVSettings} settings       The audio/video settings being used
 */
export default class SimplePeerAVClient extends AVClient {
  constructor(master, settings) {
    super(master, settings);

    this._simplePeerClient = new SimplePeerClient(this);
  }

  /* -------------------------------------------- */
  /*  Connection                                  */
  /* -------------------------------------------- */

  /**
   * One-time initialization actions that should be performed for this client implementation.
   * This will be called only once when the Game object is first set-up.
   * @return {Promise<void>}
   */
  async initialize() {
    log.debug("Initializing");

    if (this._simplePeerClient.initialized) {
      log.warn("Already initialized; skipping new initialization");
      return true;
    }

    // Initialize the local stream
    const localInit = await this._simplePeerClient.initLocalStream();
    if (!localInit) return false;

    // Set up the socket listeners
    this._simplePeerClient.initSocketListeners();

    // Break down peers when the window is closed
    window.addEventListener("beforeunload", this._simplePeerClient.closeAllPeers.bind(this._simplePeerClient));

    // Disable voice activation mode
    if (this.settings.get("client", "voice.mode") === "activity") {
      log.warn("Disabling voice activation mode as it is not supported");
      this.settings.set("client", "voice.mode", "always");
    }

    this._simplePeerClient.initialized = true;
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Connect to any servers or services needed in order to provide audio/video functionality.
   * Any parameters needed in order to establish the connection should be drawn from the settings
   * object.
   * This function should return a boolean for whether the connection attempt was successful.
   * @return {Promise<boolean>}   Was the connection attempt successful?
   */
  async connect() {
    for (const user of game.users.filter((u) => u.active && !u.isSelf)) {
      this._simplePeerClient.initPeer(user.id);
    }
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Disconnect from any servers or services which are used to provide audio/video functionality.
   * This function should return a boolean for whether a valid disconnection occurred.
   * @return {Promise<boolean>}   Did a disconnection occur?
   */
  async disconnect() {
    await this._simplePeerClient.closeAllPeers();
    return true;
  }

  /* -------------------------------------------- */
  /*  Device Discovery                            */
  /* -------------------------------------------- */

  /**
   * Provide an Object of available audio sources which can be used by this implementation.
   * Each object key should be a device id and the key should be a human-readable label.
   * @return {Promise<{string: string}>}
   */
  async getAudioSinks() {
    return new Promise((resolve) => {
      try {
        navigator.mediaDevices.enumerateDevices().then((list) => {
          resolve(deviceInfoToObject(list, "audiooutput"));
        });
      } catch (err) {
        log.error("getAudioSinks error:", err);
        resolve({});
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Provide an Object of available audio sources which can be used by this implementation.
   * Each object key should be a device id and the key should be a human-readable label.
   * @return {Promise<{string: string}>}
   */
  async getAudioSources() {
    return new Promise((resolve) => {
      try {
        navigator.mediaDevices.enumerateDevices().then((list) => {
          resolve(deviceInfoToObject(list, "audioinput"));
        });
      } catch (err) {
        log.error("getAudioSinks error:", err);
        resolve({});
      }
    });
  }

  /* -------------------------------------------- */

  /**
   * Provide an Object of available video sources which can be used by this implementation.
   * Each object key should be a device id and the key should be a human-readable label.
   * @return {Promise<{string: string}>}
   */
  async getVideoSources() {
    return new Promise((resolve) => {
      try {
        navigator.mediaDevices.enumerateDevices().then((list) => {
          resolve(deviceInfoToObject(list, "videoinput"));
        });
      } catch (err) {
        log.error("getAudioSinks error:", err);
        resolve({});
      }
    });
  }

  /* -------------------------------------------- */
  /*  Track Manipulation                          */
  /* -------------------------------------------- */

  /**
   * Return an array of Foundry User IDs which are currently connected to A/V.
   * The current user should also be included as a connected user in addition to all peers.
   * @return {string[]}           The connected User IDs
   */
  getConnectedUsers() {
    // Get remote connected users
    const connectedUsers = Array.from(this._simplePeerClient.peers.keys());

    // Add local user if our stream is live
    if (this._simplePeerClient.localStream) connectedUsers.push(game.user.id);

    return connectedUsers;
  }

  /* -------------------------------------------- */

  /**
   * Provide a MediaStream instance for a given user ID
   * @param {string} userId        The User id
   * @return {MediaStream|null}    The MediaStream for the user, or null if the user does not have
   *                                one
   */
  getMediaStreamForUser(userId) {
    return (userId === game.user.id)
      ? this._simplePeerClient.localStream : this._simplePeerClient.remoteStreams.get(userId);
  }

  /* -------------------------------------------- */

  /**
   * Is outbound audio enabled for the current user?
   * @return {boolean}
   */
  isAudioEnabled() {
    return this._simplePeerClient.localAudioEnabled;
  }

  /* -------------------------------------------- */

  /**
   * Is outbound video enabled for the current user?
   * @return {boolean}
   */
  isVideoEnabled() {
    return this._simplePeerClient.localStream
      && this._simplePeerClient.localStream.getVideoTracks().some((t) => t.enabled);
  }

  /* -------------------------------------------- */

  /**
   * Set whether the outbound audio feed for the current game user is enabled.
   * This method should be used when the user marks themselves as muted or if the gamemaster
   * globally mutes them.
   * @param {boolean} enable        Whether the outbound audio track should be enabled (true)
   *                                  or disabled (false)
   */
  toggleAudio(enable) {
    log.debug("Toggling audio:", enable);

    if (!this._simplePeerClient.localStream) {
      log.warn("Attempting to toggle audio when a local stream isn't available");
      return;
    }

    if (!this._simplePeerClient.localAudioBroadcastEnabled && this.settings.get("client", "voice.mode") === "ptt") return;
    this._simplePeerClient.localAudioEnabled = enable;
    for (const track of this._simplePeerClient.localStream.getAudioTracks()) {
      track.enabled = enable;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set whether the outbound audio feed for the current game user is actively broadcasting.
   * This can only be true if audio is enabled, but may be false if using push-to-talk or voice
   * activation modes.
   * @param {boolean} broadcast     Whether outbound audio should be sent to connected peers or not?
   */
  toggleBroadcast(broadcast) {
    log.debug("Toggling broadcast:", broadcast);

    if (!this._simplePeerClient.localStream) {
      log.warn("Attempting to broadcast audio when a local stream isn't available");
      return;
    }

    this._simplePeerClient.localAudioBroadcastEnabled = broadcast;
    for (const track of this._simplePeerClient.localStream.getAudioTracks()) {
      track.enabled = broadcast;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set whether the outbound video feed for the current game user is enabled.
   * This method should be used when the user marks themselves as hidden or if the gamemaster
   * globally hides them.
   * @param {boolean} enable        Whether the outbound video track should be enabled (true)
   *                                  or disabled (false)
   */
  toggleVideo(enable) {
    log.debug("Toggling video:", enable);

    if (!this._simplePeerClient.localStream) {
      log.warn("Attempting to toggle video when a local stream isn't available");
      return;
    }

    for (const track of this._simplePeerClient.localStream.getVideoTracks()) {
      track.enabled = enable;
    }
  }

  /* -------------------------------------------- */

  /**
   * Set the Video Track for a given User ID to a provided VideoElement
   * @param {string} userId                   The User ID to set to the element
   * @param {HTMLVideoElement} videoElement   The HTMLVideoElement to which the video should be set
   */
  async setUserVideo(userId, videoElement) {
    const stream = this.getMediaStreamForUser(userId);
    log.debug("Setting user", userId, "video element", videoElement, "to stream", stream);

    if ("srcObject" in videoElement) {
      videoElement.srcObject = stream;
    } else {
      videoElement.src = window.URL.createObjectURL(stream); // for older browsers
    }

    // Set the audio output device
    if (typeof videoElement.sinkId !== "undefined") {
      try {
        videoElement.setSinkId(this.settings.get("client", "audioSink"));
      } catch (err) {
        log.error("Error setting audio output device:", err);
      }
    } else {
      log.debug("Browser does not support output device selection");
    }
  }

  /* -------------------------------------------- */
  /*  Settings and Configuration                  */
  /* -------------------------------------------- */

  /**
   * Handle changes to A/V configuration settings.
   * @param {object} changed      The settings which have changed
   */
  onSettingsChanged(changed) {
    log.debug("Settings changed:", changed);
    const keys = Object.keys(flattenObject(changed));

    // Change audio or video sources
    if (keys.some((k) => ["client.videoSrc", "client.audioSrc"].includes(k))
      || hasProperty(changed, `users.${game.user.id}.canBroadcastVideo`)
      || hasProperty(changed, `users.${game.user.id}.canBroadcastAudio`)) {
      this._simplePeerClient.changeLocalStream();
    }

    // Change voice broadcasting mode
    if (keys.some((k) => ["client.voice.mode"].includes(k))) {
      const voiceModeAlways = this.settings.get("client", "voice.mode") === "always";
      this.toggleAudio(
        voiceModeAlways && this.master.canUserShareAudio(game.user.id),
      );
      this.master.broadcast(voiceModeAlways);
    }

    // Change audio sink device
    if (keys.some((k) => ["client.audioSink"].includes(k))) {
      this._simplePeerClient.render();
    }

    // Change muteAll
    if (keys.some((k) => ["client.muteAll"].includes(k))) {
      this._simplePeerClient.render();
    }
  }
}
