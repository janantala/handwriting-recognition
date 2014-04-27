'use strict';

var Recognizer = function(canvas) {
  var recognizer = this;
  
  var initialize = (function(){
    recognizer.canvas = canvas;
    recognizer.context = canvas.getContext('2d');

    recognizer.context.lineWidth = 10;
    recognizer.context.lineJoin = recognizer.context.lineCap = 'round';

    recognizer.moves = [];
  })();

  var clear = function(){
    recognizer.context.clearRect(0, 0, recognizer.context.canvas.width, recognizer.context.canvas.height);
    recognizer.moves = [];
  };

  var midPointBtw = function(p1, p2) {
    return {
      x: p1.x + (p2.x - p1.x) / 2,
      y: p1.y + (p2.y - p1.y) / 2
    };
  }

  var redraw = function(e){

    recognizer.context.clearRect(0, 0, recognizer.context.canvas.width, recognizer.context.canvas.height);
    
    for (var m = 0; m < recognizer.moves.length; m++) {

      var points = recognizer.moves[m];

      var p1 = points[0];
      var p2 = points[1];
      
      recognizer.context.beginPath();
      recognizer.context.moveTo(p1.x, p1.y);

      for (var i = 1, len = points.length; i < len; i++) {
        var midPoint = midPointBtw(p1, p2);
        recognizer.context.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        p1 = points[i];
        p2 = points[i+1];
      }

      recognizer.context.lineTo(p1.x, p1.y);
      recognizer.context.stroke();

    }
  }

  var mousedown = function(e){
    recognizer.isDrawing = true;
    recognizer.moves.push([]);
    var points = recognizer.moves[recognizer.moves.length - 1]
    points.push({ x: e.clientX - recognizer.canvas.clientLeft - recognizer.canvas.offsetLeft, y: e.clientY - recognizer.canvas.clientTop - recognizer.canvas.offsetTop });
  };

  var mouseup = function(e){
    recognizer.isDrawing = false;
  };

  var mousemove = function(e){
    if (recognizer.isDrawing) {
      
      var points = recognizer.moves[recognizer.moves.length - 1]
      points.push({ x: e.clientX - recognizer.canvas.clientLeft - recognizer.canvas.offsetLeft, y: e.clientY - recognizer.canvas.clientTop - recognizer.canvas.offsetTop });
      redraw(e);
    }
  };

  /**
   * Invariants
   */
  
  var isBlack = function(r, g, b, a){
    if (r === 0 && g === 0 && b === 0 && a === 255) {
      return true;
    }
    else {
      return false;
    }
  };
  
  var getBlackPixels = function(){

    var blackPixels = 0;
    var totalPixels = recognizer.context.canvas.width * recognizer.context.canvas.height;

    var imgDate = recognizer.context.getImageData(0, 0, recognizer.context.canvas.width, recognizer.context.canvas.height);
    var pixels = imgDate.data;

    for (var row = 0; row < recognizer.context.canvas.height; row++){
      for (var collumn = 0; collumn < recognizer.context.canvas.width; collumn++){
        var pixelIndex = (row * recognizer.context.canvas.width + collumn) * 4;

        var r = pixels[pixelIndex];
        var g = pixels[pixelIndex + 1];
        var b = pixels[pixelIndex + 2];
        var a = pixels[pixelIndex + 3];

        if (isBlack(r, g, b, a)){
          blackPixels++;
        }
      }
    }

    return blackPixels / totalPixels;
  };

  var getAvgDistance = function(distances){
    var sum = 0;
    for (var i=0; i<distances.length; i++){
      sum += distances[i];
    }
    return sum / distances.length;
  };

  var getMedianDistance = function(distances){
    var median = 0;
    distances.sort();

    if (distances.length % 2 === 0) {
      median = (distances[distances.length / 2 - 1] + distances[distances.length / 2]) / 2;
    }
    else {
      median = distances[(distances.length - 1) / 2];
    }

    return median;
  };

  var getManhattanDistance = function(x1, y1, xCenter, yCenter){
    return Math.abs(x1 - xCenter) + Math.abs(y1 - yCenter);;
  };

  var getCenterDistance = function(){

    var distances = [];

    var imgDate = recognizer.context.getImageData(0, 0, recognizer.context.canvas.width, recognizer.context.canvas.height);
    var pixels = imgDate.data;

    for (var row = 0; row < recognizer.context.canvas.height; row++){
      for (var collumn = 0; collumn < recognizer.context.canvas.width; collumn++){
        var pixelIndex = (row * recognizer.context.canvas.width + collumn) * 4;

        var r = pixels[pixelIndex];
        var g = pixels[pixelIndex + 1];
        var b = pixels[pixelIndex + 2];
        var a = pixels[pixelIndex + 3];

        if (isBlack(r, g, b, a)){
          distances.push(getManhattanDistance(collumn, row, Math.floor(recognizer.context.canvas.width / 2), Math.floor(recognizer.context.canvas.height / 2)))
        }
      }
    }

    return {
      'avg': getAvgDistance(distances),
      'median': getMedianDistance(distances),
    };
  };

  var getPixels = function(){
    var SAMPLE = 10;
    var imgDate = recognizer.context.getImageData(0, 0, recognizer.context.canvas.width, recognizer.context.canvas.height);
    var pixels = imgDate.data;

    var data = [];

    for (var row = 0; row < recognizer.context.canvas.height / SAMPLE; row++){
      for (var collumn = 0; collumn < recognizer.context.canvas.width / SAMPLE; collumn++){

        var blackPixels = 0;
        for (var y = 0; y < SAMPLE; y++) {
          for (var x = 0; x < SAMPLE; x++) {
            var pixelIndex = ((row * SAMPLE + y) * recognizer.context.canvas.width + collumn * SAMPLE + x) * 4;

            var r = pixels[pixelIndex];
            var g = pixels[pixelIndex + 1];
            var b = pixels[pixelIndex + 2];
            var a = pixels[pixelIndex + 3];

            if (isBlack(r, g, b, a)){
              blackPixels++;
            }
          }
        }

        if (blackPixels / (SAMPLE * SAMPLE) > 0.1) {
          data.push(1);
        }
        else {
          data.push(0);
        }

      }
    }

    return {
      'width': recognizer.context.canvas.width / SAMPLE,
      'height': recognizer.context.canvas.height / SAMPLE,
      'data': data
    };
  };
  
  /**
   * Recognizer
   */

  recognizer.canvas.onmousedown = mousedown;
  recognizer.canvas.onmouseup = mouseup;
  recognizer.canvas.onmousemove = mousemove;

  recognizer.clear = clear;

  recognizer.getInvariants = function(){

    var blackPixels = getBlackPixels();
    var pixels = getPixels();
    var centerdistance = getCenterDistance();
    return {
      'strokes': recognizer.moves.length,
      'blackPixels': blackPixels,
      'avgDistance': centerdistance.avg,
      'medianDistance': centerdistance.median,
      'pixels': pixels
    }
  };

  return recognizer;
};


