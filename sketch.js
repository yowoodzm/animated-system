let SHOW_VIDEO = true;
let SHOW_ALL_KEYPOINTS = true;
let TRACKED_KEYPOINT_INDEX = 8;
let TRACKED_HAND = 'Left';
let CURSOR_SIZE = 30;
let CURSOR_COLOR = [255, 50, 50];
let KEYPOINT_SIZE = 3;

let cam;
let handpose;
let hands = [];
let cursor;
let previousPositions = [];
let maxTrailLength = 20;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  cam = createPhoneCamera('environment', false, 'fitHeight');
  enableCameraTap();
  cam.onReady(() => {
    let options = {
      maxHands: 2,
      runtime: 'mediapipe',
      flipHorizontal: false
    };
    handpose = ml5.handPose(options, modelLoaded);
  });
}

function modelLoaded() {
  handpose.detectStart(cam.videoElement, (results) => {
    hands = results;
  });
}

function draw() {
  background(40);
  if (SHOW_VIDEO) {
    image(cam, 0, 0);
  }
  if (hands.length > 0) {
    drawAllHands();
    drawTrackedCursor();
  }
  drawUI();
}

function drawAllHands() {
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    if (!hand.keypoints || hand.keypoints.length === 0) continue;
    let allPoints = cam.mapKeypoints(hand.keypoints);
    let handLabel = hand.handedness || 'Unknown';
    let handColor;
    if (handLabel === 'Left') {
      handColor = [100, 150, 255];
    } else if (handLabel === 'Right') {
      handColor = [255, 150, 100];
    } else {
      handColor = [150, 150, 150];
    }
    if (SHOW_ALL_KEYPOINTS) {
      push();
      fill(handColor[0], handColor[1], handColor[2], 150);
      noStroke();
      for (let point of allPoints) {
        ellipse(point.x, point.y, KEYPOINT_SIZE, KEYPOINT_SIZE);
      }
      pop();
      drawHandSkeleton(allPoints, handColor);
    }
    if (allPoints[0]) {
      push();
      fill(handColor[0], handColor[1], handColor[2]);
      noStroke();
      textAlign(CENTER, BOTTOM);
      textSize(12);
      text(handLabel, allPoints[0].x, allPoints[0].y - 10);
      pop();
    }
  }
}

function drawTrackedCursor() {
  let trackedHand = null;
  if (TRACKED_HAND === 'First') {
    trackedHand = hands[0];
  } else {
    for (let hand of hands) {
      if (hand.handedness === TRACKED_HAND) {
        trackedHand = hand;
        break;
      }
    }
  }
  if (!trackedHand || !trackedHand.keypoints || !trackedHand.keypoints3D) return;
  let keypoint = trackedHand.keypoints[TRACKED_KEYPOINT_INDEX];
  cursor = cam.mapKeypoint(keypoint);
  let keypoint3D = trackedHand.keypoints3D[TRACKED_KEYPOINT_INDEX];
  cursor.z = keypoint3D.z;
  let depthSize = CURSOR_SIZE;
  if (cursor.z !== undefined) {
    depthSize = map(cursor.z, -0.1, 0.1, 50, 20);
    depthSize = constrain(depthSize, 15, 60);
  }
  previousPositions.push({x: cursor.x, y: cursor.y});
  if (previousPositions.length > maxTrailLength) {
    previousPositions.shift();
  }
  push();
  noFill();
  for (let i = 0; i < previousPositions.length - 1; i++) {
    let p1 = previousPositions[i];
    let p2 = previousPositions[i + 1];
    let alpha = map(i, 0, previousPositions.length - 1, 50, 255);
    let weight = map(i, 0, previousPositions.length - 1, 1, 8);
    stroke(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2], alpha);
    strokeWeight(weight);
    line(p1.x, p1.y, p2.x, p2.y);
  }
  fill(CURSOR_COLOR[0], CURSOR_COLOR[1], CURSOR_COLOR[2]);
  noStroke();
  ellipse(cursor.x, cursor.y, depthSize * 0.7, depthSize * 0.7);
  pop();
  push();
  fill(255);
  stroke(0);
  strokeWeight(3);
  textAlign(CENTER, TOP);
  textSize(14);
  text('x: ' + cursor.x.toFixed(0) + ', y: ' + cursor.y.toFixed(0) + ', z: ' + (cursor.z !== undefined ? cursor.z.toFixed(4) : 'N/A'), cursor.x, cursor.y + depthSize/2 + 10);
  pop();
}

function drawHandSkeleton(points, color) {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];
  push();
  stroke(color[0], color[1], color[2], 150);
  strokeWeight(2);
  for (let connection of connections) {
    let [i, j] = connection;
    if (points[i] && points[j]) {
      line(points[i].x, points[i].y, points[j].x, points[j].y);
    }
  }
  pop();
}

function drawUI() {
  push();
  fill(255);
  noStroke();
  textAlign(CENTER, TOP);
  textSize(18);
  if (!cam.ready) {
    text('Starting camera...', width/2, 20);
  } else if (hands.length === 0) {
    text('Show your hand(s) to start tracking', width/2, 20);
  } else {
    let keypointNames = {
      8: 'Index Finger Tip',
      4: 'Thumb Tip',
      12: 'Middle Finger Tip',
      16: 'Ring Finger Tip',
      20: 'Pinky Tip',
      0: 'Wrist'
    };
    let name = keypointNames[TRACKED_KEYPOINT_INDEX] || 'Keypoint ' + TRACKED_KEYPOINT_INDEX;
    text('Tracking ' + TRACKED_HAND + ' Hand: ' + name, width/2, 20);
    textSize(14);
    text('Hands detected: ' + hands.length, width/2, 45);
  }
  textSize(14);
  fill(200);
  textAlign(CENTER, BOTTOM);
  text('Touch screen to toggle video', width/2, height - 20);
  textSize(12);
  fill(SHOW_VIDEO ? [0, 255, 0] : [150, 150, 150]);
  text('Video: ' + (SHOW_VIDEO ? 'ON' : 'OFF'), width/2, height - 40);
  fill(SHOW_ALL_KEYPOINTS ? [0, 255, 0] : [150, 150, 150]);
  text('All Keypoints: ' + (SHOW_ALL_KEYPOINTS ? 'ON' : 'OFF'), width/2, height - 55);
  fill(255);
  if (cam.ready) {
    text('Camera: ' + cam.active + ' (mirrored: ' + cam.mirror + ')', width/2, height - 70);
  }
  pop();
}

function touchStarted() {
  SHOW_VIDEO = !SHOW_VIDEO;
  return false;
}

function mousePressed() {
  SHOW_VIDEO = !SHOW_VIDEO;
  return false;
}
