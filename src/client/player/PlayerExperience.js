import * as soundworks from 'soundworks/client';
import { decibelToLinear } from 'soundworks/utils/math';
import setup from '../../shared/setup';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

function distance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = degToRad(lat1);
  const φ2 = degToRad(lat2);
  const Δφ = degToRad(lat2 - lat1);
  const Δλ = degToRad(lon2 - lon1);
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function degToRad(deg) {
  return Math.PI * deg / 180;
}

function getArea(points) {
  let northernLimit = -Infinity;
  let southernLimit = Infinity;
  let westernLimit = Infinity;
  let easternLimit = -Infinity;

  for (let point of points) {
    northernLimit = Math.max(northernLimit, point.latitude);
    southernLimit = Math.min(southernLimit, point.latitude);
    westernLimit = Math.min(westernLimit, point.longitude);
    easternLimit = Math.max(easternLimit, point.longitude);
  }

  const latitude = (northernLimit + southernLimit) / 2;
  const longitude = (westernLimit + easternLimit) / 2;
  const widthInDegree = easternLimit - westernLimit;
  const heightInDegree = northernLimit - southernLimit;
  const widthInMeters = distance(latitude, westernLimit, latitude, easternLimit);
  const heightInMeters = distance(southernLimit, longitude, northernLimit, longitude);

  const area = {
    latitude,
    longitude,
    widthInDegree,
    heightInDegree,
    widthInMeters,
    heightInMeters,
  };

  return area;
}

class Scaling {
  constructor(area, width, height) {
    const margin = 20;
    const xMetersToPixel = (width - 2 * margin) / area.widthInMeters;
    const yMetersToPixel = (height - 2 * margin) / area.heightInMeters;
    const metersToPixel = Math.min(xMetersToPixel, yMetersToPixel);
    const scaleX = metersToPixel * area.widthInMeters / area.widthInDegree;
    const scaleY = -metersToPixel * area.heightInMeters / area.heightInDegree;
    const centerX = 0.5 * width;
    const centerY = 0.5 * height;
    const centerLatitude = area.latitude;
    const centerLongitude = area.longitude;

    this.centerLatitude = centerLatitude;
    this.centerLongitude = centerLongitude;
    this.centerX = centerX;
    this.centerY = centerY;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.metersToPixel = metersToPixel;
  }

  latitudeToPixels(latitude) {
    return this.centerY + (latitude - this.centerLatitude) * this.scaleY;
  }

  longitudeToPixels(longitude) {
    return this.centerX + (longitude - this.centerLongitude) * this.scaleX;
  }

  pixelsToLatitude(pixels) {
    return this.centerLatitude + (pixels - this.centerY) / this.scaleY;
  }

  pixelsToLongitude(pixels) {
    return this.centerLongitude + (pixels - this.centerX) / this.scaleX;
  }

  distanceToPixel(distance) {
    return distance * this.metersToPixel;
  }
}

class ListenerElement {
  constructor(map) {
    const container = map.$el;
    const anker = document.createElement('div');
    const center = document.createElement('img');
    const circle = document.createElement('div');

    center.src = "images/listener.png";

    anker.classList.add('listener');
    center.classList.add('center');
    circle.classList.add('circle');

    anker.appendChild(center);
    anker.appendChild(circle);
    container.appendChild(anker);

    this.anker = anker;
    this.center = center;
    this.circle = circle;
    this.map = map;
  }

  updatePosition(latitude, longitude, accuracy) {
    const scaling = this.map.scaling;
    const x = scaling.longitudeToPixels(longitude);
    const y = scaling.latitudeToPixels(latitude);
    const radius = scaling.distanceToPixel(accuracy);
    const anker = this.anker;
    const circle = this.circle;

    anker.style.left = `${x}px`;
    anker.style.top = `${y}px`;
    circle.style.margin = `${-radius}px`;
    circle.style.width = `${2 * radius}px`;
    circle.style.height = `${2 * radius}px`;
  }

  updateOrientation(orientation) {
    const anker = this.anker;
    anker.style.transform = `rotate(${orientation}deg)`;
  }
}

class PointElement {
  constructor(map, id) {
    const container = map.$el;
    const anker = document.createElement('div');
    const center = document.createElement('img');
    const innerCircle = document.createElement('div');
    const outerCircle = document.createElement('div');

    anker.id = id;
    anker.classList.add('point');
    center.src = "images/point.png";
    center.classList.add('center');
    innerCircle.classList.add('innner-circle');
    outerCircle.classList.add('outer-circle');

    anker.appendChild(center);
    anker.appendChild(innerCircle);
    anker.appendChild(outerCircle);
    container.appendChild(anker);

    this.anker = anker;
    this.center = center;
    this.innerCircle = innerCircle;
    this.outerCircle = outerCircle;
    this.map = map;
  }

  updatePosition(latitude, longitude) {
    const scaling = this.map.scaling;
    const x = scaling.longitudeToPixels(longitude);
    const y = scaling.latitudeToPixels(latitude);
    const anker = this.anker;

    anker.style.left = `${x}px`;
    anker.style.top = `${y}px`;
  }

  updateCircles(innerRadius, outerRadius) {
    const scaling = this.map.scaling;
    const inPixel = scaling.distanceToPixel(innerRadius);
    const outPixel = scaling.distanceToPixel(outerRadius);
    const innerCircle = this.innerCircle;
    const outerCircle = this.outerCircle;

    innerCircle.style.margin = `${-inPixel}px`;
    innerCircle.style.width = `${2 * inPixel}px`;
    innerCircle.style.height = `${2 * inPixel}px`;
    outerCircle.style.margin = `${-outPixel}px`;
    outerCircle.style.width = `${2 * outPixel}px`;
    outerCircle.style.height = `${2 * outPixel}px`;
  }

  setState(isActive, duration = 0) {
    const innerCircle = this.innerCircle;
    const outerCircle = this.outerCircle;

    innerCircle.style.transitionDuration = `${duration}s`;

    if (isActive) {
      innerCircle.classList.add('active');
      outerCircle.classList.add('active');
    } else {
      innerCircle.classList.remove('active');
      outerCircle.classList.remove('active');
    }
  }
}

class MapView extends soundworks.View {
  constructor(area, listener, points, listenerPositionCallback = null) {
    super("", {}, {}, { id: 'player' });

    this.area = area;
    this.listener = listener;
    this.points = points;
    this.listenerPositionCallback = listenerPositionCallback;

    this.scaling = null;
  }

  onRender() {
    this.listener.element = new ListenerElement(this);

    for (let point of this.points)
      point.element = new PointElement(this, point.setup.id);
  }

  onResize(viewportWidth, viewportHeight, orientation) {
    this.scaling = new Scaling(this.area, viewportWidth, viewportHeight);

    const listener = this.listener;
    listener.element.updatePosition(listener.latitude, listener.longitude, listener.accuracy);

    for (let point of this.points) {
      const setup = point.setup;
      point.element.updatePosition(setup.latitude, setup.longitude);

      const innerRadius = Math.min(setup.innerRadius, setup.outerRadius);
      const outerRadius = Math.max(setup.innerRadius, setup.outerRadius);
      point.element.updateCircles(innerRadius, outerRadius);
    }
  }
}

class Listener {
  constructor() {
    this.element = null; // managed by view
    this.latitude = null;
    this.longitude = null;
    this.accuracy = null;
    this.orientation = null;
  }

  setPosition(latitude, longitude, accuracy) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.accuracy = accuracy;
    this.element.updatePosition(latitude, longitude, accuracy);
  }

  setOrientation(orientation) {
    this.orientation = orientation;
    this.element.updateOrientation(orientation);
  }
}

class LoopPlayer {
  constructor(setup) {
    this.setup = setup;
    this.startMode = 'beginning'; // 'continue', 'sync'

    this.sourceNode = null;
    this.gainNode = null;
    this.fadeStartTime = Infinity;
    this.fadeStartValue = 0;
    this.fadeEndTime = Infinity;
    this.fadeEndValue = 1;

    this.startTime = null;
    this.startPosition = null;
    this.endTime = null;
    this.endPosition = null;
  }

  setState(isActive, isInsideInner, isOutsideOuter) {
    const setup = this.setup;
    const time = audioContext.currentTime;

    if (isActive) {
      if (isOutsideOuter) {
        const duration = setup.fadeOut || 0.050;
        this.desactivate(time, duration);
        return false;
      }
    } else {
      this.reset(time);

      if (isInsideInner) {
        const duration = setup.fadeIn || 0.050;
        this.activate(time, duration);
        return true;
      }
    }

    return isActive;
  }

  activate(time, duration = 0.05) {
    const setup = this.setup;
    const fadeTarget = decibelToLinear(setup.gain || 0);
    const fadeEndTime = time + (setup.fadeIn || 0.050);

    if (this.sourceNode !== null) {
      const currentGainValue = this._getCurrentFadeValue(time);
      this._startFade(time, currentGainValue, fadeEndTime, fadeTarget);
    } else {
      const buffer = setup.audio;
      const duration = buffer.duration;
      const position = time % duration;

      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0;

      const sourceNode = audioContext.createBufferSource();
      sourceNode.connect(gainNode);
      sourceNode.buffer = buffer;
      sourceNode.start(time, position);
      sourceNode.loop = true;

      this.sourceNode = sourceNode;
      this.gainNode = gainNode;

      this._startFade(time, 0, fadeEndTime, fadeTarget);
    }
  }

  desactivate(time, duration = 0.1) {
    const setup = this.setup;
    const currentGainValue = this._getCurrentFadeValue(time);
    const fadeEndTime = time + duration;

    this._startFade(time, currentGainValue, fadeEndTime, 0);
  }

  reset(time) {
    if (this.sourceNode !== null && time > this.fadeEndTime) {
      this.sourceNode.stop(time);
      this.sourceNode = null;
      this.gainNode = null;
      return true;
    }

    return false;
  }

  _getCurrentFadeValue(time) {
    if (time > this.fadeEndTime) {
      return this.fadeEndValue;
    } else if (time > this.fadeStartTime) {
      const fadeRatio = (time - this.fadeStartTime) / (this.fadeEndTime - this.fadeStartTime);
      return this.fadeStartValue + fadeRatio * (this.fadeEndValue - this.fadeStartValue);
    }

    return this.fadeStartValue;
  }

  _startFade(startTime, startValue, endTime, endValue) {
    const gainParam = this.gainNode.gain;

    if (startTime < this.fadeEndTime)
      gainParam.cancelScheduledValues(startTime);

    gainParam.setValueAtTime(startValue, startTime);
    gainParam.linearRampToValueAtTime(endValue, endTime);

    this.fadeStartTime = startTime;
    this.fadeStartValue = startValue;
    this.fadeEndTime = endTime;
    this.fadeEndValue = endValue;
  }
}

class Point {
  constructor(setup) {
    this.setup = setup;
    this.element = null; // managed by view

    this.isActive = false;
    this.player = new LoopPlayer(setup);
  }

  setListenerDistance(listenerDistance, accuracy) {
    const setup = this.setup;
    const innerRadius = Math.min(setup.innerRadius, setup.outerRadius);
    const outerRadius = Math.max(setup.innerRadius, setup.outerRadius);
    const isInsideInner = (listenerDistance < innerRadius);
    const isOutsideOuter = (listenerDistance > outerRadius);

    const isActive = this.player.setState(this.isActive, isInsideInner, isOutsideOuter);
    const duration = (isActive) ? (setup.fadeIn || 0.100) : (setup.fadeOut || 0.100);
    this.element.setState(isActive, duration);

    this.isActive = isActive;
  }
}

class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'] });
    this.sharedParams = this.require('shared-params');

    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
      files: setup,
    });

    // PROD!!!
    this.geolocation = this.require('geolocation', {
      state: 'start',
      enableHighAccuracy: true,
      debug: false,
      // timeout: 1000,
      // maximumAge: 120000,
    });

    this.listener = null;
    this.points = null;

    this.initialOrientation = null;
    this.touchId = null;

    this.onGeoposition = this.onGeoposition.bind(this);
    this.onOrientation = this.onOrientation.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  start() {
    super.start();

    const setupPoints = this.audioBufferManager.data.points;
    const area = getArea(setupPoints);
    const listener = new Listener();
    const points = [];

    for (let setupPoint of setupPoints) {
      const point = new Point(setupPoint);
      points.push(point);
    }

    this.area = area;
    this.listener = listener;
    this.points = points;
    this.view = new MapView(area, listener, points);

    this.show().then(() => {
      this.geolocation.addListener('geoposition', this.onGeoposition); // PROD!!!
      window.addEventListener('deviceorientation', this.onOrientation, false);

      const coords = client.geoposition.coords; // PROD!!!
      this.setListenerPosition(coords.latitude, coords.longitude, 10); // PROD!!!
      //this.setListenerPosition(48.053135, 8.2050165, 10); // DEV!!!

      // DEV!!!
      const surface = new soundworks.TouchSurface(this.view.$el, { normalizeCoordinates: false });
      surface.addListener('touchstart', this.onTouchStart);
      surface.addListener('touchmove', this.onTouchMove);
      surface.addListener('touchend', this.onTouchEnd);
    });
  }

  setListenerPosition(latitude, longitude, accuracy) {
    this.listener.setPosition(latitude, longitude, accuracy);

    for (let point of this.points) {
      const setup = point.setup;
      const listenerDistance = distance(setup.latitude, setup.longitude, latitude, longitude);
      point.setListenerDistance(listenerDistance, accuracy);
    }
  }

  onGeoposition(geoposition) {
    if (this.touchId === null) {
      const coords = geoposition.coords;
      this.setListenerPosition(coords.latitude, coords.longitude, coords.accuracy);
    }
  }

  onOrientation(evt) {
    if (this.initialOrientation === null && evt.absolute !== true && evt.webkitCompassAccuracy > 0 && evt.webkitCompassAccuracy < 50)
      this.initialOrientation = evt.webkitCompassHeading || 0;

    let angle = evt.alpha - this.initialOrientation;
    this.listener.setOrientation(angle);
  }

  updateTouchPosition(x, y) {
    const viewScaling = this.view.scaling;

    if (viewScaling) {
      const latitude = viewScaling.pixelsToLatitude(y);
      const longitude = viewScaling.pixelsToLongitude(x);
      this.setListenerPosition(latitude, longitude, 10);
    }
  }

  onTouchStart(id, x, y) {
    if (this.touchId === null) {
      this.updateTouchPosition(x, y);
      this.touchId = id;
    }
  }

  onTouchMove(id, x, y) {
    if (id === this.touchId)
      this.updateTouchPosition(x, y);
  }

  onTouchEnd(id) {
    if (id === this.touchId)
      this.touchId = null;
  }
}

export default PlayerExperience;
