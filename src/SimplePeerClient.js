import { MODULE_NAME } from "./utils/constants.js";
import * as log from "./utils/logging.js";

import "./libs/simplepeer.min.js";

export default class SimplePeerClient {
  constructor(simplePeerAvClient) {
    this.simplePeerAvClient = simplePeerAvClient;
    this.avMaster = simplePeerAvClient.master;
    this.settings = simplePeerAvClient.settings;

    this.initialized = false;
    this.localAudioBroadcastEnabled = false;
    this.localAudioEnabled = false;
    this.localStream = null;
    this.peers = new Map();
    this.remoteStreams = new Map();

    this.render = debounce(this.avMaster.render.bind(this.simplePeerAvClient), 2000);
  }

  /* -------------------------------------------- */
  /*  simple-peer Internal methods                */
  /* -------------------------------------------- */

  async changeLocalStream() {
    for (const peer of this.peers.values()) {
      await peer.removeStream(this.localStream);
    }

    const localInit = await this.initLocalStream();
    if (!localInit) return;

    for (const peer of this.peers.values()) {
      await peer.addStream(this.localStream);
    }

    // Make sure broadcasting is set properly
    const voiceModeAlways = this.settings.get("client", "voice.mode") === "always";
    this.simplePeerAvClient.toggleAudio(
      voiceModeAlways && this.avMaster.canUserShareAudio(game.user.id),
    );
    this.avMaster.broadcast(voiceModeAlways);

    this.render();
  }

  async closeAllPeers() {
    if (this.peers) {
      for (const userId of this.peers.keys()) {
        log.debug("Closing peer (", userId, ")");
        // // Send signal to remotes
        // await game.socket.emit(`module.${MODULE_NAME}`, {
        //   action: "peer-close",
        //   userId,
        // });
        // Close our local peer
        await this.closePeer(userId);
      }
    }
  }

  async closePeer(userId) {
    if (this.remoteStreams.has(userId)) {
      for (const remoteTrack of this.remoteStreams.get(userId).getTracks()) {
        await remoteTrack.stop();
      }
    }
    this.remoteStreams.delete(userId);

    if (this.peers.has(userId)) {
      await this.peers.get(userId).destroy();
    }
    this.peers.delete(userId);

    // this.render();
  }

  async initLocalStream() {
    log.debug("Initializing local stream");

    // Stop any existing media stream
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
    }

    // Determine if the user can send audio & video
    const audioRequested = this.settings.get("client", "audioSrc")
      && this.avMaster.canUserBroadcastAudio(game.user.id);
    const videoRequested = this.settings.get("client", "videoSrc")
      && this.avMaster.canUserBroadcastVideo(game.user.id);

    // Set audio/video constraints
    const audioConstraints = (audioRequested)
      ? {
        deviceId: { ideal: this.settings.get("client", "audioSrc") },
      } : false;
    const videoConstraints = (videoRequested)
      ? {
        deviceId: { ideal: this.settings.get("client", "videoSrc") },
        width: { ideal: 320 },
        height: { ideal: 240 },
      } : false;

    // Set up the local stream
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      });
      log.debug("Audio stream request succeeded");
    } catch (err) {
      log.error("Error getting audio device:", err);
      return false;
    }

    return true;
  }

  initPeer(userId) {
    if (!this.peers.has(userId) || !this.peers.get(userId).connected) {
      this.setupPeer(userId, true);
    } else {
      log.warn("initPeer: Peer already exists for", userId);
    }
  }

  initSocketListeners() {
    game.socket.on(`module.${MODULE_NAME}`, (request, userId) => {
      if (request.userId !== game.user.id) {
        // The request is not for us
        return;
      }

      log.debug("Socket event:", request, "from:", userId);
      switch (request.action) {
        case "peer-signal":
          this.signal(userId, request.data);
          break;
        case "peer-close":
          this.closePeer(userId);
          break;
        default:
          log.warn("Unknown socket event:", request);
      }
    });
  }

  send(userId, data) {
    if (this.peers.has(userId) && this.peers.get(userId).connected) {
      this.peers.get(userId).send(data);
    }
  }

  setupPeer(userId, isInitiator = false) {
    this.peers.set(userId, new SimplePeer({
      initiator: isInitiator,
      stream: this.localStream,
    }));

    this.peers.get(userId).on("signal", (data) => {
      log.debug("SimplePeer signal (", userId, "):", data);
      game.socket.emit(`module.${MODULE_NAME}`, {
        action: "peer-signal",
        userId,
        data,
      });
    });

    this.peers.get(userId).on("connect", () => {
      log.debug("SimplePeer connect (", userId, ")");
    });

    this.peers.get(userId).on("data", (data) => {
      log.info("SimplePeer data (", userId, "):", data.toString());
    });

    this.peers.get(userId).on("stream", (stream) => {
      // got remote video stream, now let's show it in a video tag
      log.debug("SimplePeer stream (", userId, "):", stream);

      this.remoteStreams.set(userId, stream);
      this.render();
    });

    this.peers.get(userId).on("close", () => {
      log.debug("SimplePeer close (", userId, ")");
      this.closePeer(userId);
    });

    this.peers.get(userId).on("error", (err) => {
      if (err.code === "ERR_DATA_CHANNEL") {
        log.warn("Peer connection closed (", userId, ")");
      } else {
        log.error("SimplePeer error (", userId, "):", err);
      }

      if (!this.peers.get(userId).connected) {
        this.closePeer(userId);
      }
    });
  }

  signal(userId, data) {
    // If a peered connection isn't established yet, create one
    if (!this.peers.has(userId)) {
      this.setupPeer(userId, false);
    }
    this.peers.get(userId).signal(data);
  }
}
