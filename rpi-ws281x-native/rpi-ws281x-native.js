'use strict';

module.exports = function(RED) {
    function Ws281xNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        const ws281x = require('rpi-ws281x-native');

        node.width = parseInt(config.width);
        node.height = parseInt(config.height);

        node.numLeds = node.width * node.height;
        node.mode = config.mode;
        node.reverse = config.reverse;
        node.stripType = config.striptype;
        node.gpio = parseInt(config.gpio);
        if (node.stripType.match(/-...w/g)) {
            node.numChannels = 4;
        } else {
            node.numChannels = 3;
        }

        node.brightness = Math.floor(parseInt(config.brightness) * 255 / 100);

        const options = {
            stripType: node.stripType,
            gpio: node.gpio,
            dma: 10,
            brightness: node.brightness
        };
        node.leds = ws281x(node.numLeds, options);
        node.finalArray = node.leds.array;

        node.on('input', function(msg) {
            const mode = msg.mode || node.mode;

            if (Buffer.isBuffer(msg.payload)) {
                node.bufferToArray(msg.payload, node.numLeds, mode, node.width);
                ws281x.render(node.finalArray);
            }
        });

        node.on('close', function() {
            try {
                //ws281x.finalize();
            } catch (e) {
                node.error("Error closing LEDs");
            }
        });

        node.bufferToArray = (buffer, numLeds, mode, rowLength) => {
            for (let p = 0; p < numLeds; p++) {
                let rowNum = Math.floor(p/rowLength);
                // Odd line
                if ((rowNum % 2 == 1) && node.reverse) {
                    let reversedIndex = (2 * rowNum * rowLength) - p + rowLength - 1;
                    if (mode == 'canvas') {
                        node.finalArray[reversedIndex] = buffer.readUInt32LE(p*4);
                    } else {
                        let pixel = Buffer.alloc(4);
                        if (node.numChannels == 3) {
                            buffer.copy(pixel, 1, p*3, (p*3)+3);
                            node.finalArray[reversedIndex] = pixel.readUInt32BE(0);
                        } else {
                            buffer.copy(pixel, 0, p*4, (p*4)+4);
                            node.finalArray[reversedIndex] = pixel.readUInt32LE(0);
                        }
                    }
                // Even line
                } else {
                    if (mode == 'canvas') {
                        node.finalArray[p] = buffer.readUInt32LE(p*4);
                    } else {
                        let pixel = Buffer.alloc(4);
                        if (node.numChannels == 3) {
                            buffer.copy(pixel, 1, p*3, (p*3)+3);
                            node.finalArray[p] = pixel.readUInt32BE(0);
                        } else {
                            buffer.copy(pixel, 0, p*4, (p*4)+4);
                            node.finalArray[p] = pixel.readUInt32LE(0);
                        }
                    }
                }
            }
        };
    }
    RED.nodes.registerType("rpi-ws281x-native", Ws281xNode);
};
