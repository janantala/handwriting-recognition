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

var sigmoid = function(total) {
  return 1 / (1 + Math.exp(-total));
};

NeuralNetwork.prototype.load = function(json){
  this.outputs = json.outputs;
  this.outputLayer = json.outputLayer;
  this.sizes = json.sizes;
  this.weights = json.weights;
  this.biasWeights = json.biasWeights;
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

NeuralNetwork.prototype.test = function(input) {

  var output = this.forwardPropagate(input);
  return output;
};