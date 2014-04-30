#!/usr/bin/env node
var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(2));
var fs = require('fs');

/**
 * Functions
 */

var read_json = function read_json(filename, default_value) {
  try {
    return JSON.parse(fs.readFileSync(filename));
  } catch(e) {
    return default_value || {};
  }
};

var write_json = function write_json(filename, obj) {
  fs.writeFileSync(filename + ".tmp", JSON.stringify(obj));
  fs.renameSync(filename + ".tmp", filename);
};

/**
 * Return random weight
 * @return Number from interval <-5; 5)
 */
var getRandomWeight = function() {
  return 10 * (Math.random() - 0.5);
};

/**
 * Return a new array of zeros
 * @param  Integer array size
 * @return Array of zeros [0, 0, 0, ...]
 */
var getEmptyArray = function(size) {
  var array = new Array(size);
  for (var i = 0; i < size; i++) {
    array[i] = 0;
  }
  return array;
};

/**
 * Return a new array of random weights
 * @param  Integer array size
 * @return Array of random weights [0.1, -0.14, 3.6, ...]
 */
var getRandomArray = function(size) {
  var array = new Array(size);
  for (var i = 0; i < size; i++) {
    array[i] = getRandomWeight();
  }
  return array;
};

var meanSquaredError = function(errors) {
  var sum = 0;
  for (var i = 0; i < errors.length; i++) {
    sum += Math.pow(errors[i], 2);
  }
  return sum / errors.length;
};

var sigmoid = function(total) {
  return 1 / (1 + Math.exp(-total));
};

/**
 * Compare outputs
 * @param  Array trained outputs from the neural network
 * @param  Array output  outputs from data
 * @return Boolean
 */
var sameOutputs = function(trained, output){
  var same = 0;
  for (var i=0; i<output.length; i++){
    var result;
    if (trained[i] > 0.7){ result = 1; }
    else if (trained[i] < 0.3){ result = 0; }

    if (result === output[i]) { same ++; }
  }

  return same === output.length;
};

/**
 * NeuralNetwork
 */

var NeuralNetwork = function(options) {
  options = options || {};

  this.bias = options.bias || 1;
  this.iterations = options.iterations || 10000;
  this.errorThresh = options.errorThresh || 0.01;
  this.okThresh = options.okThresh || 1;
  this.learningRate = options.learningRate || 0.3;
  this.momentum = options.momentum || 0.7;
  this.hiddenSizes = options.hiddenLayers;
  this.shuffle = options.shuffle || true;
  this.logPeriod = options.logPeriod || 1000;
};

NeuralNetwork.prototype.initialize = function(sizes) {
  this.sizes = sizes;
  this.outputLayer = sizes.length - 1;

  this.biasWeights = [];
  this.weights = [];
  this.outputs = [];

  this.deltas = [];
  this.changes = [];
  this.errors = [];

  for (var layer = 0; layer <= this.outputLayer; layer++) {
    var size = sizes[layer];
    this.deltas[layer] = getEmptyArray(size);
    this.errors[layer] = getEmptyArray(size);
    this.outputs[layer] = getEmptyArray(size);

    if (layer > 0) {
      this.biasWeights[layer] = getRandomArray(size);
      this.weights[layer] = new Array(size);
      this.changes[layer] = new Array(size);

      for (var node = 0; node < size; node++) {
        var prevSize = sizes[layer - 1];
        this.weights[layer][node] = getRandomArray(prevSize);
        this.changes[layer][node] = getEmptyArray(prevSize);
      }
    }
  }
};

/**
 * 
 * @param  {obj} data
 * [
      {input: [0, 0], output: [0]},
      {input: [0, 1], output: [1]},
      {input: [1, 0], output: [1]},
      {input: [1, 1], output: [0]}
    ]
 * @return {[type]}      [description]
 */
NeuralNetwork.prototype.train = function(data) {
  if (!data) {
    return false;
  }

  var inputSize = data[0].input.length || 0;
  var outputSize = data[0].output.length || 0;
  var hiddenSizes = this.hiddenSizes || [inputSize];

  // [4, [4, 4], 3] => [4, 4, 4, 3]
  this.initialize(_.flatten([inputSize, hiddenSizes, outputSize]));


  var error = 1;
  var ok = 0;

  var i = 0;
  while (i < this.iterations && error > this.errorThresh && ok < this.okThresh) {
    var sumError = 0;
    var sumOk = 0;

    if (this.shuffle){
      data = _.shuffle(data);
    }

    for (var j = 0; j < data.length; j++) {
      var trained = this.trainPattern(data[j].input, data[j].output);
      sumError += trained.error;
      sumOk += sameOutputs(trained.output, data[j].output) ? 1 : 0;
    }
    error = sumError / data.length;
    ok = sumOk / data.length;

    if (i % this.logPeriod === 0) {
      console.log(error +' '+ ok);
    }
    i++;
  }

  return {
    'iterations': i,
    'error': error,
    'ok': ok
  };

};

NeuralNetwork.prototype.trainPattern = function(input, output) {
  this.forwardPropagate(input);
  this.backPropagate(output);

  return {
    'output': this.forwardPropagate(input),
    'error': meanSquaredError(this.errors[this.outputLayer])
  };
};

NeuralNetwork.prototype.forwardPropagate = function(input) {
  var output;
  // set output of the input layer
  this.outputs[0] = input;

  for (var layer = 1; layer <= this.outputLayer; layer++) {
    for (var node = 0; node < this.sizes[layer]; node++) {
      var weights = this.weights[layer][node];

      var sum = this.biasWeights[layer][node] * this.bias;
      for (var k = 0; k < weights.length; k++) {
        sum += weights[k] * input[k];
      }
      this.outputs[layer][node] = sigmoid(sum);
    }
    output = input = this.outputs[layer];
  }
  return output;
};

NeuralNetwork.prototype.backPropagate = function(output) {
  this.calculateDeltas(output);
  this.adjustWeights();
};

NeuralNetwork.prototype.calculateDeltas = function(target) {
  for (var layer = this.outputLayer; layer >= 0; layer--) {
    for (var node = 0; node < this.sizes[layer]; node++) {
      var output = this.outputs[layer][node];

      var error = 0;
      if (layer === this.outputLayer) {
        error = target[node] - output;
      }
      else {
        var deltas = this.deltas[layer + 1];
        for (var k = 0; k < deltas.length; k++) {
          error += deltas[k] * this.weights[layer + 1][k][node];
        }
      }
      this.errors[layer][node] = error;
      this.deltas[layer][node] = error * output * (1 - output);
    }
  }
};

NeuralNetwork.prototype.adjustWeights = function() {
  for (var layer = 1; layer <= this.outputLayer; layer++) {
    var incoming = this.outputs[layer - 1];

    for (var node = 0; node < this.sizes[layer]; node++) {
      var delta = this.deltas[layer][node];

      for (var k = 0; k < incoming.length; k++) {
        var change = this.changes[layer][node][k];

        change = (this.learningRate * delta * incoming[k]) + (this.momentum * change);

        this.changes[layer][node][k] = change;
        this.weights[layer][node][k] += change;
      }
      this.biasWeights[layer][node] += this.learningRate * delta;
    }
  }
};

NeuralNetwork.prototype.test = function(input) {

  var output = this.forwardPropagate(input);
  return output;
};

NeuralNetwork.prototype.saveJSON = function(file){
  var json = {};
  json.outputs = this.outputs;
  json.outputLayer = this.outputLayer;
  json.sizes = this.sizes;
  json.weights = this.weights;
  json.biasWeights = this.biasWeights;

  write_json(file, json);
};

NeuralNetwork.prototype.loadJSON = function(file){
  var json = read_json(file, {});
  this.outputs = json.outputs;
  this.outputLayer = json.outputLayer;
  this.sizes = json.sizes;
  this.weights = json.weights;
  this.biasWeights = json.biasWeights;
};

var getTrainData = function(files) {

  var data = [];
  files.forEach(function(file){
    var d = [];
    var f = read_json(file, []);
    f.forEach(function(record){
      d.push({ input: record.input, output: record.output});
    });

    data = data.concat(d);
  });
  return data;
};

/**
 * Initialize Neural Network
 * @type {NeuralNetwork}
 */
var net = new NeuralNetwork(read_json(argv.o, {}));

/**
 * Switch training
 * - data
 * - load trained network from the file
 */
switch (process.env.task) {
  case 'data':
    console.log('data', argv.d);
    var d;
    if (argv.d) {
      d = read_json(argv.d, []);
    }
    else {
      d = getTrainData([
        'train/0-plain.json',
        'train/1-plain.json',
        'train/2-plain.json',
        'train/3-plain.json',
        'train/4-plain.json',
        'train/5-plain.json',
        'train/6-plain.json',
        'train/7-plain.json',
        'train/8-plain.json',
        'train/9-plain.json'
        ]);
      // d = getTrainData([
      //   'train/0.json',
      //   'train/1.json',
      //   'train/2.json',
      //   'train/3.json',
      //   'train/4.json',
      //   'train/5.json',
      //   'train/6.json',
      //   'train/7.json',
      //   'train/8.json',
      //   'train/9.json'
      //   ]);
    }
    var trained = net.train(d);
    console.dir(trained);
    break;
  default:
    if (argv.f) {
      console.log('Loading net from the file:', argv.f);
      net.loadJSON(argv.f);
    }
    break;
}

/**
 * Save network into file
 */
if (argv.s) {
  net.saveJSON(argv.s);
  console.log('Saving net into file:', argv.s);
  console.log('\n');
}

/**
 * Test Neural Network
 */
if (argv.t) {
  var testData = read_json(argv.t, []);
  testData.forEach(function(d){
    console.log(net.test(d['input']));
  });
}



