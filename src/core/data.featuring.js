function getFeatures(input, data) {
    const features = [];
    const re = /(\w+)(\[])/;
    input.types.forEach((type, index) => {
        let typeParts = type.split(re);
        features.push(`arg_${input.names[index]}`);
        data[`arg_${input.names[index]}`] = input.inputs[index];
        //fixme
        typeParts = typeParts.filter((el) => {
            return el !== '';
        });
        if (typeParts.length > 1 && typeParts[1] === '[]') {
            features.push(`arg_${input.names[index]}_length`);
            data[`arg_${input.names[index]}_length`] = input.inputs[index].length;
            if (typeParts[0].match('int') !== null) {
                features.push(`arg_${input.names[index]}_min`);
                data[`arg_${input.names[index]}_min`] = Math.min(...input.inputs[index]);
                features.push(`arg_${data.names[index]}_max`);
                data[`arg_${input.names[index]}_max`] = Math.max(...input.inputs[index]);
            }
            if (typeParts[0].match('string') !== null || typeParts[0].match('byte') !== null || typeParts[0].match('hex') !== null) {
                const strLenArr = input.inputs[index].map((str) => {
                    return str.length;
                });
                features.push(`arg_${input.names[index]}_minLength`);
                data[`arg_${input.names[index]}_minLength`] = Math.min(...strLenArr);
                features.push(`arg_${input.names[index]}_maxLength`);
                data[`arg_${input.names[index]}_maxLength`] = Math.max(...strLenArr);
                let numArray = input.inputs[index].map((str) => {
                    return isNaN ? false : Number(str);
                });
                numArray = numArray.filter((el) => {
                    return el;
                });
                if (numArray.length) {
                    features.push(`arg_${input.names[index]}_min`);
                    data[`arg_${input.names[index]}_min`] = Math.min(...numArray);
                    features.push(`arg_${input.names[index]}_max`);
                    data[`arg_${input.names[index]}_max`] = Math.max(...numArray);
                }
            }
            return;
        }
        if (typeParts[0].match('byte') !== null) {
            features.push(`arg_${input.names[index]}_length`);
            data[`arg_${input.names[index]}_length`] = input.inputs[index].length;
        }
        if (typeParts[0].match('string') !== null) {
            features.push(`arg_${input.names[index]}_length`);
            data[`arg_${input.names[index]}_length`] = input.inputs[index].length;
            if (input.inputs[index] && !isNaN(input.inputs[index])) {
                features.push(`arg_${input.names[index]}_num`);
                data[`arg_${input.names[index]}_num`] = input.inputs[index];
            }
        }
    });
    return [...new Set(features)];
}

module.exports = { getFeatures };