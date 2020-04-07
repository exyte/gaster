const { FeatureType } = require('./enums');

function getFeatures(data) {
    const { types, names, inputs } = data;
    const re = /(\w+)(\[])/;
    const features = [];

    types.forEach((type, index) => {
        const input = inputs[index];
        const name = names[index];

        let typeParts = type.split(re);
        typeParts = typeParts.filter((el) => {
            return el !== '';
        });

        if (typeParts.length > 1 && typeParts[1] === '[]') {
            features.push({
                name: name,
                type: FeatureType.LENGTH,
                value: input.length,
            });
            if (typeParts[0].match('int') !== null) {
                features.push({
                    name: name,
                    type: FeatureType.MIN,
                    value: Math.min(...input),
                });
                features.push({
                    name: name,
                    type: FeatureType.MAX,
                    value: Math.max(...input),
                });
            }
            if (typeParts[0].match('string') !== null) {
                const strLenArr = input.map((str) => {
                    return str.length;
                });
                features.push({
                    name: name,
                    type: FeatureType.MIN,
                    value: Math.min(...strLenArr),
                });
                features.push({
                    name: name,
                    type: FeatureType.MAX,
                    value: Math.max(...strLenArr),
                });
            }
        } else {
            if (typeParts[0].match('string') !== null) {
                features.push({
                    name: name,
                    type: FeatureType.LENGTH,
                    value: input.length,
                });
                if (input && !isNaN(input)) {
                    features.push({
                        name: name,
                        type: FeatureType.NUM,
                        value: Number(input),
                    });
                }
            }
        }
    });
    return features;
}

module.exports = { getFeatures };
