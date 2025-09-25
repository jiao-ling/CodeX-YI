/**
 * 卦象数据服务 - 管理易经卦象数据
 */
const HexagramDataService = (function() {

    const DATA_URL = 'data/hexagrams.json';
    const BAGUA_DATA_URL = 'data/bagua.json';

    let rawHexagramData = null;
    let hexagramMap = {};
    let baguaData = null;
    let isInitialized = false;

    // 初始化
    async function init() {
        try {
            if (isInitialized) return;

            YizhiApp.performance.start('hexagram_data_init');

            // 处理卦象数据
            await processHexagramData();

            isInitialized = true;
            YizhiApp.performance.end('hexagram_data_init');

            YizhiApp.events.emit('hexagram-data:ready');
        } catch (error) {
            YizhiApp.errors.handle(error, 'Hexagram Data Service Init');
        }
    }

    // 加载卦象数据
    async function loadHexagramData() {
        if (rawHexagramData) {
            return rawHexagramData;
        }

        if (typeof fetch === 'function') {
            try {
                const response = await fetch(DATA_URL, { cache: 'default' });
                if (!response.ok) {
                    throw new Error(`Failed to load hexagram data: ${response.status}`);
                }
                const data = await response.json();
                rawHexagramData = data;
                return data;
            } catch (error) {
                const fallbackData = getPreloadedHexagramData();
                if (fallbackData) {
                    console.warn('加载远程卦象数据失败，使用预加载数据回退。', error);
                    rawHexagramData = fallbackData;
                    return fallbackData;
                }
                YizhiApp.errors.handle(error, 'Load Hexagram Data');
                throw error;
            }
        }

        const fallback = getPreloadedHexagramData();
        if (fallback) {
            rawHexagramData = fallback;
            return fallback;
        }

        const loadError = new Error('Hexagram data is not available.');
        YizhiApp.errors.handle(loadError, 'Load Hexagram Data');
        throw loadError;
    }

    function getPreloadedHexagramData() {
        if (typeof window !== 'undefined' && window.__HEXAGRAM_DATA__) {
            return window.__HEXAGRAM_DATA__;
        }
        return null;
    }

    async function loadBaguaData() {
        if (baguaData) {
            return baguaData;
        }

        if (typeof fetch === 'function') {
            try {
                const response = await fetch(BAGUA_DATA_URL, { cache: 'default' });
                if (!response.ok) {
                    throw new Error('Failed to load bagua data: ' + response.status);
                }
                const data = await response.json();
                baguaData = data;
                return data;
            } catch (error) {
                const fallbackData = getPreloadedBaguaData();
                if (fallbackData) {
                    console.warn('加载远程八卦数据失败，使用预加载数据回退。', error);
                    baguaData = fallbackData;
                    return fallbackData;
                }
                YizhiApp.errors.handle(error, 'Load Bagua Data');
                throw error;
            }
        }

        const fallback = getPreloadedBaguaData();
        if (fallback) {
            baguaData = fallback;
            return fallback;
        }

        const loadError = new Error('Bagua data is not available.');
        YizhiApp.errors.handle(loadError, 'Load Bagua Data');
        throw loadError;
    }

    function getPreloadedBaguaData() {
        if (typeof window !== 'undefined' && window.__BAGUA_DATA__) {
            return window.__BAGUA_DATA__;
        }
        return null;
    }

    // 处理卦象数据
    async function processHexagramData() {
        await loadBaguaData();
        const data = await loadHexagramData();
        hexagramMap = YizhiApp.utils.deepClone(data);

        for (const key in hexagramMap) {
            const id = parseInt(key, 10);
            hexagramMap[key].id = id;

            // 计算上卦和下卦
            calculateTrigrams(hexagramMap[key]);

            // 计算相关卦象关系
            calculateRelations(hexagramMap[key]);
        }
    }

    // 计算卦象的上下卦
    function calculateTrigrams(hexagram) {
        const binary = hexagram.binary;
        if (binary && binary.length === 6) {
            const upperBinary = binary.slice(0, 3);
            const lowerBinary = binary.slice(3);

            hexagram.upperTrigram = getBaguaByBinary(upperBinary);
            hexagram.lowerTrigram = getBaguaByBinary(lowerBinary);
        }
    }

    // 计算关系数据结构
    function calculateRelations(hexagram) {
        hexagram.relations = {};
        hexagram.relations.opposite = calculateOpposite(hexagram.binary);
        hexagram.relations.inverse = calculateInverse(hexagram.binary);
        hexagram.relations.mutual = calculateMutual(hexagram.binary);
    }

    // 计算对宫卦
    function calculateOpposite(binary) {
        const oppositeBinary = binary.split('').map(bit => bit === '1' ? '0' : '1').join('');
        return getHexagramIdByBinary(oppositeBinary);
    }

    // 计算综卦
    function calculateInverse(binary) {
        const inverseBinary = binary.split('').reverse().join('');
        return getHexagramIdByBinary(inverseBinary);
    }

    // 计算互卦
    function calculateMutual(binary) {
        const third = binary.charAt(2);
        const fourth = binary.charAt(3);
        const fifth = binary.charAt(4);
        const second = binary.charAt(1);

        const mutualBinary = second + third + fourth + third + fourth + fifth;
        return getHexagramIdByBinary(mutualBinary);
    }

    // 通过二进制获取卦象ID
    function getHexagramIdByBinary(binary) {
        for (const key in hexagramMap) {
            if (hexagramMap[key].binary === binary) {
                return parseInt(key);
            }
        }
        return 1;
    }

    // 根据二进制代码获取八卦
    function getBaguaByBinary(binary) {
        if (!baguaData) {
            return null;
        }
        for (const name in baguaData) {
            if (baguaData[name].binary === binary) {
                return name;
            }
        }
        return null;
    }

    // 公共API方法
    function getHexagramByBinary(binary) {
        for (const key in hexagramMap) {
            if (hexagramMap[key].binary === binary) {
                const hexagram = hexagramMap[key];
                if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                    calculateTrigrams(hexagram);
                }
                return hexagram;
            }
        }
        return null;
    }

    function getHexagramById(id) {
        const hexagram = hexagramMap[id] || null;
        if (hexagram) {
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }
            if (!hexagram.relations) {
                calculateRelations(hexagram);
            }
        }
        return hexagram;
    }

    function getBaguaData() {
        return baguaData || {};
    }

    function getBagua(name) {
        return (baguaData && baguaData[name]) || null;
    }

    function getHexagramByTrigrams(upper, lower) {
        for (const key in hexagramMap) {
            const hexagram = hexagramMap[key];
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }
            if (hexagram.upperTrigram === upper && hexagram.lowerTrigram === lower) {
                return hexagram;
            }
        }
        return null;
    }

    function searchHexagrams(keyword) {
        keyword = keyword.toLowerCase();
        const results = [];

        for (const key in hexagramMap) {
            const hexagram = hexagramMap[key];
            if (!hexagram.upperTrigram || !hexagram.lowerTrigram) {
                calculateTrigrams(hexagram);
            }

            if (hexagram.name.toLowerCase().includes(keyword) ||
                hexagram.explanation.toLowerCase().includes(keyword) ||
                (hexagram.overview && hexagram.overview.toLowerCase().includes(keyword)) ||
                (hexagram.detail && hexagram.detail.toLowerCase().includes(keyword))) {
                results.push(hexagram);
            }
        }

        return results;
    }

    function getRelatedHexagrams(hexagramId) {
        const hexagram = hexagramMap[hexagramId];
        if (!hexagram || !hexagram.relations) {
            return {};
        }

        const related = {};
        for (const [type, id] of Object.entries(hexagram.relations)) {
            related[type] = getHexagramById(id);
        }

        return related;
    }

    function getAllHexagrams() {
        return Object.values(hexagramMap);
    }

    return {
        init,
        getHexagramByBinary,
        getHexagramById,
        getBaguaData,
        getBagua,
        getHexagramByTrigrams,
        searchHexagrams,
        getRelatedHexagrams,
        getAllHexagrams,
        get isInitialized() { return isInitialized; }
    };
})();

