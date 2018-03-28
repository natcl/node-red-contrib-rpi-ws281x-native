'use strict';

module.exports = function(RED) {
    function Ws281xNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const ws281x = require('rpi-ws281x-native');

        node.width = parseInt(config.width);
        node.height = parseInt(config.height);

        node.numLeds = node.width * node.height;
        node.reverse = config.reverse;
        node.stripType = config.striptype;
        if (node.stripType.match(/-...w/g)) {
            node.numChannels = 4;
        } else {
            node.numChannels = 3;
        }


        node.brightness = Math.floor(parseInt(config.brightness) * 255 / 100);

        const options = {
            stripType: node.stripType,
            dma: 10,
            brightness: node.brightness
        };
        node.leds = ws281x(node.numLeds, options);
        node.finalArray = node.leds.array;

        node.on('input', function(msg) {
            if (Buffer.isBuffer(msg.payload)) {
                node.bufferToArray(msg.payload, node.numLeds, node.width);
                ws281x.render(node.finalArray);
            }
        });

        node.on('close', function() {
            try {
                ws281x.finalize();
            } catch (e) {
                node.error("Error closing LEDs");
            }
        });

        node.bufferToArray = (buffer, numLeds, rowLength) => {
            for (let p = 0; p < numLeds; p++) {
                let rowNum = Math.floor(p/rowLength);
                // Si impair
                if ((rowNum % 2 == 1) && node.reverse) {
                    node.finalArray[(2 * rowNum * rowLength) - p + rowLength - 1] = buffer.readUInt32LE(p * node.numChannels);
                } else {
                    node.finalArray[p] = buffer.readUInt32LE(p * node.numChannels);
                }
            }
        };
    }
    RED.nodes.registerType("rpi-ws281x-native", Ws281xNode);
};
