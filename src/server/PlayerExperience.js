import { Experience } from 'soundworks/server';
import setup from '../shared/setup';

const gameSetups = setup.games;

export default class PlayerExperience extends Experience {
  constructor() {
    super('player');

    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.geolocation = this.require('geolocation');
  }

  start() {

  }

  enter(client) {
    super.enter(client);

    this.sharedParams.update('numPlayers', this.clients.length);
  }

  exit(client) {
    super.exit(client);
    this.sharedParams.update('numPlayers', this.clients.length);
  }
}