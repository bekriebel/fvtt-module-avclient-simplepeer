import { MODULE_NAME } from "./utils/constants.js";
import * as log from "./utils/logging.js";

import "./libs/simplepeer.min.js";

/**
 * An AVClient implementation that uses WebRTC and the simple-peer library.
 * @extends {AVClient}
 * @param {AVMaster} master           The master orchestration instance
 * @param {AVSettings} settings       The audio/video settings being used
 */
export default class SimplePeerAVClient extends AVClient {
  // constructor(master, settings) {
  //   super(master, settings);
  // }

  /* -------------------------------------------- */
  /*  Connection                                  */
  /* -------------------------------------------- */

  /**
   * One-time initialization actions that should be performed for this client implementation.
   * This will be called only once when the Game object is first set-up.
   * @return {Promise<void>}
   */
  async initialize() {
    throw Error("The initialize() method must be defined by an AVClient subclass.");
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
    throw Error("The connect() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Disconnect from any servers or services which are used to provide audio/video functionality.
   * This function should return a boolean for whether a valid disconnection occurred.
   * @return {Promise<boolean>}   Did a disconnection occur?
   */
  async disconnect() {
    throw Error("The disconnect() method must be defined by an AVClient subclass.");
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
    throw Error("The getAudioSinks() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Provide an Object of available audio sources which can be used by this implementation.
   * Each object key should be a device id and the key should be a human-readable label.
   * @return {Promise<{string: string}>}
   */
  async getAudioSources() {
    throw Error("The getAudioSources() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Provide an Object of available video sources which can be used by this implementation.
   * Each object key should be a device id and the key should be a human-readable label.
   * @return {Promise<{string: string}>}
   */
  async getVideoSources() {
    throw Error("The getVideoSources() method must be defined by an AVClient subclass.");
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
    throw Error("The getConnectedUsers() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Provide a MediaStream instance for a given user ID
   * @param {string} userId        The User id
   * @return {MediaStream|null}    The MediaStream for the user, or null if the user does not have
   *                                one
   */
  getMediaStreamForUser(userId) {
    throw Error("The getMediaStreamForUser() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Is outbound audio enabled for the current user?
   * @return {boolean}
   */
  isAudioEnabled() {
    throw Error("The isAudioEnabled() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Is outbound video enabled for the current user?
   * @return {boolean}
   */
  isVideoEnabled() {
    throw Error("The isVideoEnabled() method must be defined by an AVClient subclass.");
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
    throw Error("The toggleAudio() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Set whether the outbound audio feed for the current game user is actively broadcasting.
   * This can only be true if audio is enabled, but may be false if using push-to-talk or voice
   * activation modes.
   * @param {boolean} broadcast     Whether outbound audio should be sent to connected peers or not?
   */
  toggleBroadcast(broadcast) {
    throw Error("The toggleBroadcast() method must be defined by an AVClient subclass.");
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
    throw Error("The toggleVideo() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */

  /**
   * Set the Video Track for a given User ID to a provided VideoElement
   * @param {string} userId                   The User ID to set to the element
   * @param {HTMLVideoElement} videoElement   The HTMLVideoElement to which the video should be set
   */
  async setUserVideo(userId, videoElement) {
    throw Error("The setUserVideo() method must be defined by an AVClient subclass.");
  }

  /* -------------------------------------------- */
  /*  Settings and Configuration                  */
  /* -------------------------------------------- */

  /**
   * Handle changes to A/V configuration settings.
   * @param {object} changed      The settings which have changed
   */
  onSettingsChanged(changed) {}
}