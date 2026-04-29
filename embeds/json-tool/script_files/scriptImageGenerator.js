// 剧本图生成工具函数
// 此文件包含生成剧本图、细节图等功能

// 辅助函数：将十六进制颜色转换为 rgba 格式
function hexToRgba(hex, opacity) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return hex;
}

// 辅助函数：将DataURL转换为Blob对象
function dataURLToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// 辅助函数：将URL转换为本地路径（用于生成剧本图）
function convertToLocalPath(imageUrl) {
    if (!imageUrl) return '';
    // 如果是完整的URL，转换为本地路径
    if (imageUrl.includes('https://oss.gstonegames.com/data_file/clocktower/web/icons/')) {
        const fileName = imageUrl.split('/').pop();
        return `images/${fileName}`;
    }
    // 如果是上传的图片URL，保持原样
    if (imageUrl.includes('upload/')) {
        return imageUrl;
    }
    // 其他情况保持原样
    return imageUrl;
}

async function generateScriptImageV2() {
            try {
                // 防止重复点击
                let isGeneratingScriptImage = false;
                if (isGeneratingScriptImage) {
                    console.log('剧本图生成中，请稍候...');
                    return;
                }
                isGeneratingScriptImage = true;
                
                // 获取数据
                selectedRoles = getSelectedRoles();
                console.log('剧本图V2生成 - 被选中的角色数量:', selectedRoles.length);
                console.log('剧本图V2生成 - 被选中的角色:', selectedRoles.map(role => role.name));
                
                // 直接使用selectedRoles作为allRoles，因为selectedRoles已经包含了所有被选中的角色及其属性
                const allRoles = selectedRoles;
                console.log('剧本图V2生成 - 使用selectedRoles作为allRoles，角色数量:', allRoles.length);
                console.log('剧本图V2生成 - allRoles中的角色:', allRoles.map(role => role.name));
                const editionName = metaInfoJson.name || '未知剧本';
                const authorName = metaInfoJson.author || '';
                const scriptLogo = metaInfoJson.logo || document.getElementById('logo')?.value?.trim() || '';
                
                // 获取自定义阵营名称和颜色
                const customTeamNames = {
                    townsfolk: document.getElementById('custom-townsfolk-name')?.value?.trim() || '镇民',
                    outsider: document.getElementById('custom-outsider-name')?.value?.trim() || '外来者',
                    minion: document.getElementById('custom-minion-name')?.value?.trim() || '爪牙',
                    demon: document.getElementById('custom-demon-name')?.value?.trim() || '恶魔'
                };
                
                const customTeamColors = {
                    townsfolk: document.getElementById('custom-townsfolk-color')?.value || '#1e3a5f',
                    outsider: document.getElementById('custom-outsider-color')?.value || '#0d5c5c',
                    minion: document.getElementById('custom-minion-color')?.value || '#8b4513',
                    demon: document.getElementById('custom-demon-color')?.value || '#8b0000'
                };
                
                // 获取二维码图片
                const qrcodeImage = metaInfoJson.almanac || document.getElementById('qrcode-image-input')?.value?.trim() || '';
                
                // 获取剧本自制规则
                const bootleggerRulesArray = Array.isArray(metaInfoJson.bootlegger) ? metaInfoJson.bootlegger : (metaInfoJson.bootlegger ? [metaInfoJson.bootlegger] : []);
                const bootleggerRules = bootleggerRulesArray.join('\n');
                
                // 获取显示选项
                const showNightOrder = document.getElementById('showNightOrder')?.checked ?? true;
                const showConfigTable = document.getElementById('showConfigTable')?.checked ?? true;
                const showCustomRules = document.getElementById('showCustomRules')?.checked ?? false;
                const showTravellersFabled = document.getElementById('showTravellersFabled')?.checked ?? true;
                const showJinxRules = document.getElementById('showJinxRules')?.checked ?? true;
                const reverseOtherNight = document.getElementById('reverseOtherNight')?.checked ?? false;
                
                // 获取布局方案
                const scriptLayout = document.getElementById('script-layout')?.value || 'scheme1';
                
                // 获取背景颜色设置
                const customBgColor = document.getElementById('bg-color-setting')?.value || '#f6f6f4';
                const bgOpacity = parseInt(document.getElementById('bg-opacity-setting')?.value || '100') / 100;
                
                // 直接使用剧本信息中的状态设置来决定是否显示状态栏
                // 1. 默认情况下：显示状态栏（中毒醉酒和疯狂）
                // 2. 用户添加了自定义状态：显示自定义状态和勾选的中毒醉酒疯狂
                // 3. 用户明确保存了空状态和没有勾选醉酒中毒以及疯狂：不显示状态栏
                // 检查是否是首次生成，没有保存过剧本信息
                const isFirstTime = !metaInfoJson || !metaInfoJson.name;
                // 检查是否有状态信息
                const hasState = metaInfoJson.state && metaInfoJson.state.length > 0;
                // 检查是否保存了空状态
                const hasEmptyState = metaInfoJson.state && metaInfoJson.state.length === 0;
                // 决定是否显示状态栏
                const showStatusBar = isFirstTime || hasState;
                console.log('是否显示状态栏:', showStatusBar, '是否首次生成:', isFirstTime, '是否有状态:', hasState, '是否保存了空状态:', hasEmptyState);
                
                // 获取相克规则
                const jinxRules = [];
                const roleNames = allRoles.map(role => role.name);
                
                console.log('剧本图V2生成 - 角色名称列表:', roleNames);
                console.log('剧本图V2生成 - jinxes变量是否存在:', typeof jinxes !== 'undefined');
                console.log('剧本图V2生成 - jinxes长度:', typeof jinxes !== 'undefined' ? jinxes.length : 0);
                
                // 检查是否存在相克规则库
                if (typeof jinxes !== 'undefined') {
                    jinxes.forEach(rule => {
                        if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                            if (!rule.jinxRule.includes('（试运行相克规则）')) {
                                jinxRules.push(rule);
                            }
                        }
                    });
                }
                
                // 检查是否存在用户添加的相克规则
                if (typeof userAddedJinxRules !== 'undefined') {
                    userAddedJinxRules.forEach(rule => {
                        if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                            if (!rule.jinxRule.includes('（试运行相克规则）')) {
                                jinxRules.push(rule);
                            }
                        }
                    });
                }
                
                // 检查是否存在全局相克规则
                if (typeof window.jinxes !== 'undefined') {
                    window.jinxes.forEach(rule => {
                        if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                            if (!rule.jinxRule.includes('（试运行相克规则）')) {
                                jinxRules.push(rule);
                            }
                        }
                    });
                }
                
                // 检查是否存在用户在JSON编辑器中添加的相克规则（存储在dirRolesJson中）
                if (typeof dirRolesJson !== 'undefined') {
                    dirRolesJson.forEach(item => {
                        // 检查是否是相克规则项（通过team字段或id后缀判断）
                        if ((item.team === 'a jinxed' || item.team === '相克') && item.name && item.ability) {
                            // 尝试从名称中提取两个角色名称
                            const nameParts = item.name.split(' & ');
                            if (nameParts.length === 2) {
                                const jinxRole1 = nameParts[0];
                                const jinxRole2 = nameParts[1];
                                if (roleNames.includes(jinxRole1) && roleNames.includes(jinxRole2)) {
                                    const jinxRule = {
                                        jinxRole1: jinxRole1,
                                        jinxRole2: jinxRole2,
                                        jinxRule: item.ability
                                    };
                                    jinxRules.push(jinxRule);
                                }
                            }
                        }
                    });
                }
                
                console.log('剧本图V2生成 - 匹配的相克规则数量:', jinxRules.length);
                console.log('剧本图V2生成 - 匹配的相克规则:', jinxRules);
                
                // 获取首夜和其他夜晚顺序
                let allFirstNight = [];
                let allOtherNight = [];
                
                console.log('剧本图V2生成 - metaInfoJson.firstNight:', metaInfoJson.firstNight);
                console.log('剧本图V2生成 - metaInfoJson.otherNight:', metaInfoJson.otherNight);
                
                // 定义元信息角色映射
                const metaRolesMap = {
                    'minioninfo': { firstNight: 2000, name: '爪牙信息', image: 'images/180px-Mi.png' },
                    'demoninfo': { firstNight: 3000, name: '恶魔信息', image: 'images/180px-Di.png' },
                    'twilight': { firstNight: -100, otherNight: -100, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.png' },
                    'dawn': { firstNight: 12700, otherNight: 15000, name: '黎明', image: 'images/dawn.png' },
                    '黄昏': { firstNight: -100, otherNight: -100, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.png' },
                    '黎明': { firstNight: 12700, otherNight: 15000, name: '黎明', image: 'images/dawn.png' }
                };
                
                // 优先使用metaInfoJson中的夜间顺序
                if (metaInfoJson.firstNight && metaInfoJson.firstNight.length > 0 && metaInfoJson.firstNight[0] !== "") {
                    console.log('使用metaInfoJson中的首夜顺序');
                    // 按照metaInfoJson.firstNight中的顺序构建首夜顺序
                    const orderedFirstNight = metaInfoJson.firstNight.map(roleId => {
                        // 先检查是否是元信息角色
                        if (metaRolesMap[roleId]) {
                            console.log('首夜角色ID:', roleId, '找到元信息角色:', metaRolesMap[roleId].name);
                            return metaRolesMap[roleId];
                        }
                        // 查找对应的角色
                        let role = allRoles.find(role => role.id === roleId) || null;
                        // 如果在allRoles中没有找到，尝试从dirRolesJson中查找
                        if (!role && typeof dirRolesJson !== 'undefined') {
                            role = dirRolesJson.find(role => role.id === roleId) || null;
                        }
                        if (role) {
                            console.log('首夜角色ID:', roleId, '找到角色:', role.name);
                            return role;
                        }
                        console.log('首夜角色ID:', roleId, '未找到角色');
                        return null;
                    }).filter(Boolean);
                    
                    // 构建首夜顺序，保持剧本信息中的原始顺序
                    allFirstNight = [...orderedFirstNight];
                    
                    // 检查并添加缺失的元信息角色
                    if (!allFirstNight.some(item => item.name === '黄昏')) {
                        allFirstNight.unshift(metaRolesMap['twilight']);
                    }
                    if (!allFirstNight.some(item => item.name === '爪牙信息')) {
                        allFirstNight.push(metaRolesMap['minioninfo']);
                    }
                    if (!allFirstNight.some(item => item.name === '恶魔信息')) {
                        allFirstNight.push(metaRolesMap['demoninfo']);
                    }
                    if (!allFirstNight.some(item => item.name === '黎明')) {
                        allFirstNight.push(metaRolesMap['dawn']);
                    }
                    console.log('首夜顺序:', allFirstNight.map(item => item.name));
                    console.log('添加黄昏和黎明后的首夜顺序:', allFirstNight.map(item => item.name));
                    
                    // 如果过滤后没有角色，使用默认顺序
                    if (allFirstNight.length === 0) {
                        console.log('metaInfoJson中的首夜顺序为空，使用默认顺序');
                        // 按照角色的firstNight属性排序
                        // 只包含firstNight大于0的角色
                        const firstNightRoles = allRoles.filter(role => role.firstNight > 0).sort((a, b) => {
                            // 首先按照firstNight排序
                            const orderA = a.firstNight || 0;
                            const orderB = b.firstNight || 0;
                            if (orderA !== orderB) {
                                return orderA - orderB;
                            }
                            // 如果firstNight相同，按照otherNight排序
                            const otherOrderA = a.otherNight || 0;
                            const otherOrderB = b.otherNight || 0;
                            return otherOrderA - otherOrderB;
                        });
                        // 添加元信息角色
                        const metaFirstNight = [
                            metaRolesMap['twilight'],
                            metaRolesMap['minioninfo'],
                            metaRolesMap['demoninfo'],
                            metaRolesMap['dawn']
                        ];
                        allFirstNight = [...firstNightRoles, ...metaFirstNight].sort((a, b) => {
                            const orderA = a.firstNight || 0;
                            const orderB = b.firstNight || 0;
                            return orderA - orderB;
                        });
                        console.log('默认首夜顺序:', allFirstNight.map(item => item.name));
                    }
                } else {
                    console.log('使用角色默认的首夜顺序');
                    // 否则按照角色的firstNight属性排序
                    // 只包含firstNight大于0的角色
                    const firstNightRoles = allRoles.filter(role => role.firstNight > 0).sort((a, b) => {
                        // 首先按照firstNight排序
                        const orderA = a.firstNight || 0;
                        const orderB = b.firstNight || 0;
                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }
                        // 如果firstNight相同，按照otherNight排序
                        const otherOrderA = a.otherNight || 0;
                        const otherOrderB = b.otherNight || 0;
                        return otherOrderA - otherOrderB;
                    });
                    // 添加元信息角色
                    const metaFirstNight = [
                        metaRolesMap['twilight'],
                        metaRolesMap['minioninfo'],
                        metaRolesMap['demoninfo'],
                        metaRolesMap['dawn']
                    ];
                    allFirstNight = [...firstNightRoles, ...metaFirstNight].sort((a, b) => {
                        const orderA = a.firstNight || 0;
                        const orderB = b.firstNight || 0;
                        return orderA - orderB;
                    });
                    console.log('默认首夜顺序:', allFirstNight.map(item => item.name));
                }
                
                if (metaInfoJson.otherNight && metaInfoJson.otherNight.length > 0 && metaInfoJson.otherNight[0] !== "") {
                    console.log('使用metaInfoJson中的其他夜晚顺序');
                    // 按照metaInfoJson.otherNight中的顺序构建其他夜晚顺序
                    const orderedOtherNight = metaInfoJson.otherNight.map(roleId => {
                        // 先检查是否是元信息角色
                        if (metaRolesMap[roleId]) {
                            console.log('其他夜晚角色ID:', roleId, '找到元信息角色:', metaRolesMap[roleId].name);
                            return metaRolesMap[roleId];
                        }
                        // 查找对应的角色
                        let role = allRoles.find(role => role.id === roleId) || null;
                        // 如果在allRoles中没有找到，尝试从dirRolesJson中查找
                        if (!role && typeof dirRolesJson !== 'undefined') {
                            role = dirRolesJson.find(role => role.id === roleId) || null;
                        }
                        if (role) {
                            console.log('其他夜晚角色ID:', roleId, '找到角色:', role.name);
                            return role;
                        }
                        console.log('其他夜晚角色ID:', roleId, '未找到角色');
                        return null;
                    }).filter(Boolean);
                    
                    // 构建其他夜晚顺序，保持剧本信息中的原始顺序
                    allOtherNight = [...orderedOtherNight];
                    
                    // 检查并添加缺失的元信息角色
                    if (!allOtherNight.some(item => item.name === '黄昏')) {
                        allOtherNight.unshift(metaRolesMap['twilight']);
                    }
                    if (!allOtherNight.some(item => item.name === '黎明')) {
                        allOtherNight.push(metaRolesMap['dawn']);
                    }
                    console.log('其他夜晚顺序:', allOtherNight.map(item => item.name));
                    console.log('添加黄昏和黎明后的其他夜晚顺序:', allOtherNight.map(item => item.name));
                    
                    // 如果过滤后没有角色，使用默认顺序
                    if (allOtherNight.length === 0) {
                        console.log('metaInfoJson中的其他夜晚顺序为空，使用默认顺序');
                        // 否则按照角色的otherNight属性排序
                        // 只包含otherNight大于0的角色
                        const otherNightRoles = allRoles.filter(role => role.otherNight > 0).sort((a, b) => {
                            // 首先按照otherNight排序
                            const orderA = a.otherNight || 0;
                            const orderB = b.otherNight || 0;
                            if (orderA !== orderB) {
                                return orderA - orderB;
                            }
                            // 如果otherNight相同，按照firstNight排序
                            const firstOrderA = a.firstNight || 0;
                            const firstOrderB = b.firstNight || 0;
                            return firstOrderA - firstOrderB;
                        });
                        // 添加元信息角色
                        const metaOtherNight = [
                            metaRolesMap['twilight'],
                            metaRolesMap['dawn']
                        ];
                        allOtherNight = [...otherNightRoles, ...metaOtherNight].sort((a, b) => {
                            const orderA = a.otherNight || 0;
                            const orderB = b.otherNight || 0;
                            return orderA - orderB;
                        });
                        console.log('默认其他夜晚顺序:', allOtherNight.map(item => item.name));
                    }
                } else {
                    console.log('使用角色默认的其他夜晚顺序');
                    // 否则按照角色的otherNight属性排序
                    // 只包含otherNight大于0的角色
                    const otherNightRoles = allRoles.filter(role => role.otherNight > 0).sort((a, b) => {
                        // 首先按照otherNight排序
                        const orderA = a.otherNight || 0;
                        const orderB = b.otherNight || 0;
                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }
                        // 如果otherNight相同，按照firstNight排序
                        const firstOrderA = a.firstNight || 0;
                        const firstOrderB = b.firstNight || 0;
                        return firstOrderA - firstOrderB;
                    });
                    // 添加元信息角色
                    const metaOtherNight = [
                        metaRolesMap['twilight'],
                        metaRolesMap['dawn']
                    ];
                    allOtherNight = [...otherNightRoles, ...metaOtherNight].sort((a, b) => {
                        const orderA = a.otherNight || 0;
                        const orderB = b.otherNight || 0;
                        return orderA - orderB;
                    });
                    console.log('默认其他夜晚顺序:', allOtherNight.map(item => item.name));
                }
                
                // 角色排序函数
                const sortRolesByAbility = (roles) => {
                    const abilityOrder = [
                        '在你的首个夜晚，你会得知',
                        '在夜晚时',
                        '在夜晚',
                        '每个黄昏 *',
                        '每个夜晚',
                        '每个夜晚 *',
                        '每个白天',
                        '每局游戏限一次，在夜晚时',
                        '每局游戏限一次，在夜晚时 *',
                        '每局游戏限一次，在白天时',
                        '每局游戏限一次',
                        '在你的首个夜晚',
                        '在你的首个白天',
                        '你认为',
                        '你是',
                        '你拥有',
                        '你不知道',
                        '你可能',
                        '你',
                        '当你死亡时',
                        '当你得知你死亡时',
                        '当',
                        '如果你死亡',
                        '如果你死亡',
                        '如果你 "疯狂" 地',
                        '如果你',
                        '如果恶魔死亡',
                        '如果恶魔杀死了',
                        '如果恶魔',
                        '如果… 都',
                        '如果大于等于五名玩家存活时',
                        '如果',
                        '所有玩家都',
                        '所有',
                        '当… 首次',
                        '善良',
                        '邪恶',
                        '玩家',
                        '爪牙'
                    ];
                    
                    return roles.sort((a, b) => {
                        const abilityA = a.ability || '';
                        const abilityB = b.ability || '';
                        
                        let orderA = abilityOrder.length;
                        let orderB = abilityOrder.length;
                        
                        for (let i = 0; i < abilityOrder.length; i++) {
                            if (abilityA.includes(abilityOrder[i])) {
                                orderA = i;
                                break;
                            }
                        }
                        
                        for (let i = 0; i < abilityOrder.length; i++) {
                            if (abilityB.includes(abilityOrder[i])) {
                                orderB = i;
                                break;
                            }
                        }
                        
                        if (orderA !== orderB) {
                            return orderA - orderB;
                        }
                        
                        return abilityA.length - abilityB.length;
                    });
                };
                
                // 获取自定义阵营
                const validCustomTeams = [];
                const customTeamRoleIds = new Set();
                if (typeof customTeams !== 'undefined') {
                    customTeams.forEach((team, index) => {
                        const name = team.name || '';
                        const color = team.color || '#6b5a45';
                        const roles = team.roles || [];
                        if (roles.length > 0) {
                            validCustomTeams.push({ name, color, roles, index });
                            // 收集自定义阵营中的角色ID
                            roles.forEach(role => {
                                customTeamRoleIds.add(role.id);
                            });
                        }
                    });
                }
                
                // 按阵营分组角色（保持已选角色的排序顺序）
                const townsfolkRoles = [];
                const outsiderRoles = [];
                const minionRoles = [];
                const demonRoles = [];
                const fabledRoles = [];
                const travellerRoles = [];
                
                // 按原有顺序分组，保持已选角色的排序，跳过已添加到自定义阵营的角色
                allRoles.forEach(role => {
                    // 跳过已添加到自定义阵营的角色
                    if (customTeamRoleIds.has(role.id)) {
                        return;
                    }
                    
                    if (role.team === 'townsfolk' || role.team === '镇民') {
                        townsfolkRoles.push(role);
                    } else if (role.team === 'outsider' || role.team === '外来者') {
                        outsiderRoles.push(role);
                    } else if (role.team === 'minion' || role.team === '爪牙') {
                        minionRoles.push(role);
                    } else if (role.team === 'demon' || role.team === '恶魔') {
                        demonRoles.push(role);
                    } else if (role.team === 'fabled' || role.team === '传奇角色') {
                        fabledRoles.push(role);
                    } else if (role.team === 'traveller' || role.team === '旅行者') {
                        travellerRoles.push(role);
                    }
                });
                
                // 检测是否为移动端
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                
                // 创建预览容器
                const previewContainer = document.createElement('div');
                previewContainer.id = 'script-image-preview-v2';
                previewContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    z-index: 10000;
                    padding: ${isMobile ? '10px' : '20px'};
                    box-sizing: border-box;
                    overflow: auto;
                `;
                
                // 获取字号设置
                const fontSizeInput = document.getElementById('font-size-setting');
                const fontSize = fontSizeInput?.value || 'small';
                const fontSizeMultiplier = fontSize === 'large' ? 1.2 : 1.0;
                
                // 创建剧本图容器 - 初始设置
                const scriptPage = document.createElement('div');
                scriptPage.style.cssText = `
                    background: ${hexToRgba(customBgColor, bgOpacity)};
                    width: ${isMobile ? '520px' : '8.27in'};
                    padding: ${isMobile ? '10px' : '0.3in'};
                    box-sizing: border-box;
                    position: relative;
                    font-family: 'Assistant', 'Microsoft YaHei', sans-serif;
                    margin: ${isMobile ? '0' : 'auto'};
                `;
                
                // 构建首夜顺序HTML（左侧垂直排列）
                const firstNightHtml = allFirstNight.map(role => `
                    <img src="${convertToLocalPath(role.image)}" style="width: 45px; height: 45px; margin: -5px 0; object-fit: cover; display: block;">
                `).join('');
                
                // 构建其他夜晚顺序HTML（右侧垂直排列）
                const otherNightHtml = allOtherNight.map(role => `
                    <img src="${convertToLocalPath(role.image)}" style="width: 45px; height: 45px; margin: -5px 0; object-fit: cover; display: block;${!reverseOtherNight ? '' : ' transform: rotate(180deg);'}">
                `).join('');
                

                
                // 为每个角色创建相克规则映射
                const roleJinxMap = {};
                allRoles.forEach(role => {
                    roleJinxMap[role.name] = jinxRules.filter(rule =>
                        rule.jinxRole1 === role.name || rule.jinxRole2 === role.name
                    );
                });

                // 用于跟踪已经展示过的相克规则（避免重复显示）
                const displayedJinxRules = new Set();

                // 构建角色卡片HTML
                const createRoleCard = (role, color = '#0b6aaf') => {
                    // 获取当前角色的相克规则
                    const jinxRulesForRole = roleJinxMap[role.name] || [];

                    // 过滤出未展示过的相克规则，并标记为已展示
                    const undisplayedJinxRules = jinxRulesForRole.filter(rule => {
                        // 创建规则的唯一标识（按角色名字母顺序排序，确保一致性）
                        const ruleKey = [rule.jinxRole1, rule.jinxRole2].sort().join('|');
                        if (displayedJinxRules.has(ruleKey)) {
                            return false; // 已经展示过，不显示
                        }
                        displayedJinxRules.add(ruleKey); // 标记为已展示
                        return true;
                    });

                    // 构建该角色的相克规则文本HTML（显示在角色卡片下方，白色底框突出显示）
                    const jinxRulesHtml = showJinxRules && undisplayedJinxRules.length > 0 ? `
                        <div style="margin-top: 6px; padding: 8px 10px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 10px; line-height: 1.5; color: #555; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                            ${undisplayedJinxRules.map(rule => {
                                const otherRoleName = rule.jinxRole1 === role.name ? rule.jinxRole2 : rule.jinxRole1;
                                const otherRole = allRoles.find(r => r.name === otherRoleName);
                                return `<div style="margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">${otherRole ? `<img src="${convertToLocalPath(otherRole.image)}" style="width: 20px; height: 20px; object-fit: cover; border-radius: 3px; flex-shrink: 0;">` : ''} : ${rule.jinxRule}</div>`;
                            }).join('')}
                        </div>
                    ` : '';

                    return `
                        <div style="display: flex; align-items: flex-start; margin-bottom: 8px; break-inside: avoid;">
                            <img src="${convertToLocalPath(role.image)}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 8px; flex-shrink: 0;">
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; flex-direction: row; align-items: center; flex-wrap: wrap;">
                                    <div style="font-weight: bold; font-size: ${13 * fontSizeMultiplier}px; color: ${color}; margin-bottom: 2px; padding-right: 5px;">${role.name}</div>
                                </div>
                                <div style="font-size: ${11 * fontSizeMultiplier}px; line-height: 1.3; color: #333;">${role.ability || ''}</div>
                                ${jinxRulesHtml}
                            </div>
                        </div>
                    `;
                };
                
                // 构建阵营区域HTML
                const createTeamSection = (title, roles, color = '#0b6aaf') => {
                    if (roles.length === 0) return '';
                    
                    // 检查是否启用横向排列
                    const horizontalLayout = document.getElementById('horizontalLayout');
                    const useHorizontalLayout = horizontalLayout && horizontalLayout.checked;
                    
                    if (useHorizontalLayout) {
                        // 横向排列（wrap方式）
                        return `
                            <div style="margin-bottom: 15px; max-width: 100%;">
                                <div style="font-family: 'Philo', serif; font-size: 16px; font-weight: bold; color: ${color}; padding-bottom: 3px; margin-bottom: 8px; display: flex; align-items: flex-start; max-width: 100%;">
                                <div style="writing-mode: vertical-rl; text-orientation: mixed; line-height: 1.8;">${title}</div>
                                <div style="flex: 1; height: 1px; background: ${color}; margin-left: 10px;"></div>
                            </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 10px; max-width: 100%; box-sizing: border-box;">
                                    ${roles.map(role => `
                                        <div style="flex: 0 1 calc(50% - 10px); min-width: 250px; max-width: calc(50% - 10px); box-sizing: border-box;">
                                            ${createRoleCard(role, color)}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    } else {
                        // 竖向排列（默认）：先填满第一列，再填满第二列
                        const midIndex = Math.ceil(roles.length / 2);
                        const leftColumn = roles.slice(0, midIndex);
                        const rightColumn = roles.slice(midIndex);
                        
                        return `
                            <div style="margin-bottom: 15px; max-width: 100%;">
                                <div style="font-family: 'Philo', serif; font-size: 16px; font-weight: bold; color: ${color}; padding-bottom: 3px; margin-bottom: 8px; display: flex; align-items: flex-start; max-width: 100%;">
                                <div style="writing-mode: vertical-rl; text-orientation: mixed; line-height: 1.8;">${title}</div>
                                <div style="flex: 1; height: 1px; background: ${color}; margin-left: 10px;"></div>
                            </div>
                                <div style="display: flex; gap: 10px; max-width: 100%; box-sizing: border-box;">
                                    <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                                        ${leftColumn.map(role => `
                                            <div style="box-sizing: border-box;">
                                                ${createRoleCard(role, color)}
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                                        ${rightColumn.map(role => `
                                            <div style="box-sizing: border-box;">
                                                ${createRoleCard(role, color)}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                };
                
                // 构建玩家数量表格
                const playerCountTable = `
                    <img src="https://i.postimg.cc/021k6s9F/playercount.png" style="width: 100%; object-fit: contain;">
                `;
                
                // 构建标题区域HTML
                const titleSection = `
                    <!-- 左侧：剧本标题和图标 -->
                    <div style="flex: 1; display: flex; align-items: center; gap: 15px; max-width: 50%;">
                        ${scriptLogo ? `<img src="${scriptLogo}" style="max-width: 400px; max-height: 200px; object-fit: contain;">` : ''}
                        <div style="display: flex; flex-direction: column;">
                            ${scriptLogo ? `
                                <div style="font-family: 'Philo', serif; font-size: 14px; color: #800000; font-weight: bold; font-style: italic;">
                                    <span style="font-style: normal; font-size: 10px; color: #666;">by </span>${authorName || ''}
                                </div>
                            ` : `
                                <div style="font-family: 'Philo', serif; font-size: 24px; color: #800000; font-weight: bold;">
                                    ${editionName}
                                </div>
                                ${authorName ? `
                                    <div style="font-family: 'Philo', serif; font-size: 14px; color: #800000; font-weight: bold; font-style: italic; margin-top: 3px;">
                                        <span style="font-style: normal; font-size: 10px; color: #666;">by </span>${authorName}
                                    </div>
                                ` : ''}
                            `}
                        </div>
                    </div>
                `;
                
                // 构建配置表和二维码区域HTML
                const configSection = `
                    <!-- 中间：二维码 -->
                    ${qrcodeImage ? `
                        <div style="display: flex; flex-direction: column; align-items: center; margin: 0 10px;">
                            <img src="${qrcodeImage}" alt="二维码" style="max-height: 80px; max-width: 80px; object-fit: contain;">
                            <div style="text-align: center; color: #b8860b; font-size: 10px; margin-top: 3px; font-weight: bold;">扫码查看运作</div>
                        </div>
                    ` : ''}
                    <!-- 右侧：玩家数量表格和传奇角色/旅行者 -->
                    <div style="display: flex; gap: 10px; margin-right: 0; flex-shrink: 0;">
                        ${showConfigTable ? `
                        <div style="width: 300px; flex-shrink: 0;">
                            ${playerCountTable}
                        </div>
                        ` : ''}
                        ${showTravellersFabled && (fabledRoles.length > 0 || travellerRoles.length > 0) ? `
                            <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0;">
                                ${fabledRoles.map(role => `
                                    <img src="${convertToLocalPath(role.image)}" style="width: 25px; height: 25px; object-fit: cover; margin: 1px 0;">
                                `).join('')}
                                ${travellerRoles.map(role => `
                                    <img src="${convertToLocalPath(role.image)}" style="width: 25px; height: 25px; object-fit: cover; margin: 1px 0;">
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                // 构建角色列表区域HTML
                const rolesSection = `
                    <div style="display: flex; flex: 1; position: relative; max-width: 100%; box-sizing: border-box;">
                        ${showNightOrder ? `
                        <!-- 左侧首夜顺序 -->
                        <div style="width: 25px; display: flex; flex-direction: column; align-items: center; padding-right: 2px;">
                            ${firstNightHtml}
                        </div>
                        
                        <!-- 左侧分割线（首夜） -->
                        <div style="display: flex; flex-direction: column; align-items: center; padding: 0 1px;">
                            <div style="flex: 1; width: 1px; background: #333;"></div>
                            <div style="font-family: 'Philo', serif; font-size: 12px; padding: 4px 0; color: #333; font-weight: bold; line-height: 1.5; white-space: pre;">首<br>夜</div>
                            <div style="flex: 1; width: 1px; background: #333;"></div>
                        </div>
                        ` : ''}
                        
                        <!-- 中间角色列表 -->
                        <div style="flex: 1; padding: 0 5px; max-width: 100%; box-sizing: border-box;">
                            ${createTeamSection(customTeamNames.townsfolk, townsfolkRoles, customTeamColors.townsfolk)}
                            ${createTeamSection(customTeamNames.outsider, outsiderRoles, customTeamColors.outsider)}
                            ${createTeamSection(customTeamNames.minion, minionRoles, customTeamColors.minion)}
                            ${createTeamSection(customTeamNames.demon, demonRoles, customTeamColors.demon)}
                            ${validCustomTeams.map(team => createTeamSection(team.name, team.roles, team.color)).join('')}
                        </div>
                        
                        ${showNightOrder ? `
                        <!-- 右侧分割线（他夜） -->
                        <div style="display: flex; flex-direction: column; align-items: center; padding: 0 1px;">
                            <div style="flex: 1; width: 1px; background: #333;"></div>
                            <div style="font-family: 'Philo', serif; font-size: 12px; padding: 4px 0; color: #333; font-weight: bold; line-height: 1.5; white-space: pre; transform: rotate(180deg);">他<br>夜</div>
                            <div style="flex: 1; width: 1px; background: #333;"></div>
                        </div>
                        
                        <!-- 右侧其他夜顺序 -->
                        <div style="width: 25px; display: flex; flex-direction: ${!reverseOtherNight ? 'column' : 'column-reverse'}; align-items: center; padding-left: 2px;">
                            ${otherNightHtml}
                        </div>
                        ` : ''}
                    </div>
                `;
                
                // 构建状态和规则区域HTML
                const statusAndRulesSection = `
                    ${showStatusBar ? `
                    <!-- 异常状态说明 -->
                    <div style="margin-top: 10px; padding: 8px 5px; max-width: 100%; box-sizing: border-box;">
                        <div style="font-weight: bold; color: ${customTeamColors.demon}; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center;">
                            <span>异常状态</span>
                            <div style="flex: 1; height: 1px; background: ${customTeamColors.demon}; margin-left: 8px;"></div>
                        </div>
                        <div style="font-size: 10px; line-height: 1.4; color: #333; max-width: 100%; box-sizing: border-box;">
                            ${!metaInfoJson.state || metaInfoJson.state.length === 0 ? `
                            <!-- 默认状态：显示中毒醉酒和疯狂 -->
                            <div style="margin-bottom: 4px;"><b style="color: #9932cc;">疯狂</b> - 当一名玩家需要"疯狂"地证明某件事情时，意味着他应该去努力说服其他玩家那件事情是真的。</div>
                            <div><b style="color: ${customTeamColors.demon};">中毒/醉酒</b> - 中毒的玩家会失去自身能力，但他不会知道，仍以为自己具有能力。如果中毒的玩家能力会给他提供信息，那么信息可能正确可能错误，说书人会合理欺骗你。醉酒同理。</div>
                            ` : `
                            <!-- 显示保存的状态 -->
                            ${metaInfoJson.state.map(state => `
                                <div style="margin-bottom: 4px;"><b style="color: ${state.name === '疯狂' ? '#9932cc' : customTeamColors.demon};">${state.name}</b> - ${state.description}</div>
                            `).join('')}
                            `}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${showCustomRules && bootleggerRulesArray.length > 0 ? `
                    <!-- 剧本自制规则 -->
                    <div style="margin-top: 10px; padding: 8px 5px; max-width: 100%; box-sizing: border-box;">
                        <div style="font-weight: bold; color: ${customTeamColors.demon}; margin-bottom: 6px; font-size: 12px; display: flex; align-items: center;">
                            <span>剧本自制规则</span>
                            <div style="flex: 1; height: 1px; background: ${customTeamColors.demon}; margin-left: 8px;"></div>
                        </div>
                        <div style="font-size: 10px; line-height: 1.4; color: #333; max-width: 100%; box-sizing: border-box;">
                            ${bootleggerRulesArray.map(rule => {
                                // 尝试解析规则，将第一个部分作为标题
                                const parts = rule.split(' - ');
                                if (parts.length > 1) {
                                    return `<div style="margin-bottom: 4px;"><b style="color: ${customTeamColors.demon};">${parts[0]}</b> - ${parts.slice(1).join(' - ')}</div>`;
                                } else {
                                    // 如果没有标题部分，整个作为描述
                                    return `<div style="margin-bottom: 4px;">${rule}</div>`;
                                }
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                `;
                
                // 根据布局方案组装完整的剧本图HTML
                // 方案二：构建夜间顺序（统一在右侧，去重，不旋转，左边首夜数字，右边他夜数字）
                const nightOrderMap = new Map();
                
                // 添加首夜顺序
                allFirstNight.forEach((role, index) => {
                    const existing = nightOrderMap.get(role.name) || { image: role.image, firstNight: null, otherNight: null };
                    existing.firstNight = index + 1;
                    nightOrderMap.set(role.name, existing);
                });
                
                // 添加他夜顺序
                allOtherNight.forEach((role, index) => {
                    const existing = nightOrderMap.get(role.name) || { image: role.image, firstNight: null, otherNight: null };
                    existing.otherNight = index + 1;
                    nightOrderMap.set(role.name, existing);
                });
                
                // 合并顺序：以首夜为主，先按首夜顺序，再按他夜顺序（只在他夜出现的角色）
                const combinedOrder = [];
                allFirstNight.forEach(role => {
                    if (!combinedOrder.find(r => r.name === role.name)) {
                        combinedOrder.push({ name: role.name, image: role.image });
                    }
                });
                allOtherNight.forEach(role => {
                    if (!combinedOrder.find(r => r.name === role.name)) {
                        combinedOrder.push({ name: role.name, image: role.image });
                    }
                });
                
                // 构建夜间顺序HTML
                const nightOrderCombined = combinedOrder.map(item => {
                    const info = nightOrderMap.get(item.name);
                    return `
                        <div style="display: flex; align-items: center; gap: 4px; margin: 2px 0;">
                            <span style="font-size: 11px; color: #8b0000; width: 16px; text-align: right;">${info.firstNight || ''}</span>
                            <img src="${convertToLocalPath(item.image)}" style="width: 40px; height: 40px; object-fit: cover;">
                            <span style="font-size: 11px; color: #8b0000; width: 16px; text-align: left;">${info.otherNight || ''}</span>
                        </div>
                    `;
                }).join('');
                
                // 处理技能描述中的高亮文字（使用全局 highlightMap 关键词映射）
                const highlightAbility = (text) => {
                    if (!text) return '';
                    let result = text;
                    // 使用全局定义的 highlightMap 进行关键词高亮
                    if (typeof highlightMap !== 'undefined' && Array.isArray(highlightMap)) {
                        for (const item of highlightMap) {
                            for (const keyword of item.keywords) {
                                // 使用零宽断言避免重复替换
                                const regex = new RegExp(`(?<!<span[^>]*>)(${keyword})(?!<\/span>)`, 'g');
                                result = result.replace(regex, `<span style="color: ${item.color}; font-weight: bold;">$1</span>`);
                            }
                        }
                    }
                    return result;
                };
                
                // 预先处理所有角色的技能描述（使用新变量避免修改常量）
                const highlightedTownsfolk = townsfolkRoles.map(r => ({...r, ability: highlightAbility(r.ability)}));
                const highlightedOutsider = outsiderRoles.map(r => ({...r, ability: highlightAbility(r.ability)}));
                const highlightedMinion = minionRoles.map(r => ({...r, ability: highlightAbility(r.ability)}));
                const highlightedDemon = demonRoles.map(r => ({...r, ability: highlightAbility(r.ability)}));
                const highlightedCustomTeams = validCustomTeams.map(t => ({...t, roles: t.roles.map(r => ({...r, ability: highlightAbility(r.ability)}))}));
                
                let scriptHtml = '';
                if (scriptLayout === 'scheme2') {
                    // 方案二：阵营标签在左侧，角色卡片在中间，夜间顺序在右侧
                    scriptHtml = `
                        <div style="background: ${customBgColor}; display: block; overflow: hidden;">
                            <!-- 顶部区域：标题 -->
                            <div style="margin-bottom: 15px;">
                                <div style="font-family: 'Philo', serif; font-size: 20px; color: #8b0000; font-weight: bold;">
                                    ${editionName}
                                </div>
                                ${authorName ? `
                                    <div style="font-family: 'Philo', serif; font-size: 12px; color: #666; margin-top: 2px;">
                                        ${authorName}
                                    </div>
                                ` : ''}
                            </div>
                            
                            <!-- 中间主体区域 -->
                            <div style="display: flex; gap: 10px;">
                                <!-- 左侧：角色和状态 -->
                                <div style="flex: 1;">
                                    <!-- 镇民 -->
                                <div style="display: flex;">
                                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #1e3a5f; padding: 12px 6px; min-height: 100px; min-width: 30px; flex-shrink: 0;">
                                        <span style="font-family: 'Philo', serif; font-size: 16px; color: white; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px;">镇民</span>
                                    </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 6px 10px; border-left: 3px solid #1e3a5f;">
                                            ${highlightedTownsfolk.map(role => `
                                                <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                    <div style="display: flex; gap: 12px;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: 65px; height: 65px; object-fit: cover; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 3px;">${role.name}</div>
                                                            <div style="font-size: 13px; color: #666; line-height: 1.4;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <!-- 外来者 -->
                                    <div style="display: flex; margin-top: 8px;">
                                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #0d5c5c; padding: 12px 6px; min-height: 100px; min-width: 30px; flex-shrink: 0;">
                                            <span style="font-family: 'Philo', serif; font-size: 16px; color: white; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px;">外来者</span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 6px 10px; border-left: 3px solid #0d5c5c;">
                                            ${highlightedOutsider.map(role => `
                                                <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                    <div style="display: flex; gap: 12px;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: 65px; height: 65px; object-fit: cover; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 3px;">${role.name}</div>
                                                            <div style="font-size: 13px; color: #666; line-height: 1.4;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <!-- 爪牙 -->
                                    <div style="display: flex; margin-top: 8px;">
                                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #8b4513; padding: 12px 6px; min-height: 100px; min-width: 30px; flex-shrink: 0;">
                                            <span style="font-family: 'Philo', serif; font-size: 16px; color: white; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px;">爪牙</span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 6px 10px; border-left: 3px solid #8b4513;">
                                            ${highlightedMinion.map(role => `
                                                <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                    <div style="display: flex; gap: 12px;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: 65px; height: 65px; object-fit: cover; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 3px;">${role.name}</div>
                                                            <div style="font-size: 13px; color: #666; line-height: 1.4;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <!-- 恶魔 -->
                                    <div style="display: flex; margin-top: 8px;">
                                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #8b0000; padding: 12px 6px; min-height: 100px; min-width: 30px; flex-shrink: 0;">
                                            <span style="font-family: 'Philo', serif; font-size: 16px; color: white; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px;">恶魔</span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 6px 10px; border-left: 3px solid #8b0000;">
                                            ${highlightedDemon.map(role => `
                                                <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                    <div style="display: flex; gap: 12px;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: 65px; height: 65px; object-fit: cover; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 3px;">${role.name}</div>
                                                            <div style="font-size: 13px; color: #666; line-height: 1.4;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <!-- 自定义阵营 -->
                                    ${highlightedCustomTeams.map(team => `
                                    <div style="display: flex; margin-top: 8px;">
                                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: ${team.color}; padding: 12px 6px; min-height: 100px; min-width: 30px; flex-shrink: 0;">
                                            <span style="font-family: 'Philo', serif; font-size: 16px; color: white; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px;">${team.name}</span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 6px 10px; border-left: 3px solid ${team.color};">
                                                ${team.roles.map(role => `
                                                    <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                        <div style="display: flex; gap: 12px;">
                                                            <img src="${convertToLocalPath(role.image)}" style="width: 65px; height: 65px; object-fit: cover; flex-shrink: 0;">
                                                            <div style="flex: 1; min-width: 0;">
                                                                <div style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 3px;">${role.name}</div>
                                                                <div style="font-size: 13px; color: #666; line-height: 1.4;">${role.ability || ''}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                    </div>
                                    `).join('')}
                                    
                                    <!-- 旅行者/传奇角色 -->
                                    ${showTravellersFabled && (fabledRoles.length > 0 || travellerRoles.length > 0) ? `
                                    <div style="display: flex; margin-top: 8px;">
                                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; background: #666; padding: 12px 6px; min-height: 100px; min-width: 30px; flex-shrink: 0;">
                                            <span style="font-family: 'Philo', serif; font-size: 16px; color: white; font-weight: bold; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 2px;">旅行者/传奇</span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 6px 10px; border-left: 3px solid #666;">
                                            ${[...fabledRoles, ...travellerRoles].map(role => `
                                                <div style="background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                                    <div style="display: flex; gap: 12px;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: 65px; height: 65px; object-fit: cover; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: 15px; color: #333; margin-bottom: 3px;">${role.name}</div>
                                                            <div style="font-size: 13px; color: #666; line-height: 1.4;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                    ` : ''}
                                    
                                    <!-- 底部：状态和规则 -->
                                    ${showStatusBar || jinxRules.length > 0 ? `
                                    <div style="margin-top: 4px; padding: 15px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        ${showStatusBar ? `
                                        <div style="font-weight: bold; color: #8b0000; margin-bottom: 10px; font-size: 16px;">
                                            <span style="background: #8b0000; color: white; padding: 3px 8px; border-radius: 4px; font-size: 13px;">异常状态</span>
                                        </div>
                                        <div style="font-size: 14px; line-height: 1.6; color: #333;">
                                            ${!metaInfoJson.state || metaInfoJson.state.length === 0 ? `
                                            <div style="margin-bottom: 6px;"><b style="color: #9932cc;">疯狂</b> - 当一名玩家需要"疯狂"地证明某件事情时，意味着他应该去努力说服其他玩家那件事情是真的。</div>
                                            <div><b style="color: #8b0000;">中毒/醉酒</b> - 中毒的玩家会失去自身能力，但他不会知道，仍以为自己具有能力。如果中毒的玩家能力会给他提供信息，那么信息可能正确可能错误，说书人会合理欺骗你。醉酒同理。</div>
                                            ` : `
                                            ${metaInfoJson.state.map(state => `
                                                <div style="margin-bottom: 6px;"><b style="color: ${state.name === '疯狂' ? '#9932cc' : '#8b0000'};">${state.name}</b> - ${state.description}</div>
                                            `).join('')}
                                            `}
                                        </div>
                                        ` : ''}
                                        ${jinxRules.length > 0 ? `
                                        <div style="${showStatusBar ? 'border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px;' : ''}">
                                            <div style="font-weight: bold; color: #8b0000; margin-bottom: 10px; font-size: 16px;">
                                                <span style="background: #9932cc; color: white; padding: 3px 8px; border-radius: 4px; font-size: 13px;">相克规则</span>
                                            </div>
                                            <div style="font-size: 14px; line-height: 1.6; color: #333;">
                                                ${jinxRules.map(rule => `
                                                    <div style="margin-bottom: 6px;"><b style="color: #9932cc;">${rule.jinxRole1} + ${rule.jinxRole2}</b> - ${rule.jinxRule}</div>
                                                `).join('')}
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>
                                    ` : ''}
                                    
                                    <!-- 玩家数量表格 -->
                                    ${showConfigTable ? `
                                    <div style="margin-top: 8px; padding: 15px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                        ${playerCountTable}
                                    </div>
                                    ` : ''}
                                </div>
                                <!-- 右侧：夜间顺序 -->
                                <div style="width: 90px; padding-left: 10px; border-left: 1px solid #ddd; display: flex; flex-direction: column; align-items: center;">
                                    <div style="font-family: 'Philo', serif; font-size: 12px; color: #8b0000; font-weight: bold; margin-bottom: 8px; display: flex; flex-direction: column; align-items: center;">
                                        <span>夜</span>
                                        <span>间</span>
                                        <span>顺</span>
                                        <span>序</span>
                                    </div>
                                    <div style="display: flex; flex-direction: column; align-items: center;">
                                        ${nightOrderCombined}
                                    </div>
                                    <!-- 底部注释：每行一个字 -->
                                    <div style="font-size: 9px; color: #666; margin-top: 8px; display: flex; flex-direction: column; align-items: center;">
                                        <span>*指</span>
                                        <span>非</span>
                                        <span>首</span>
                                        <span>个</span>
                                        <span>夜</span>
                                        <span>晚</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${showCustomRules && bootleggerRulesArray.length > 0 ? `
                            <div style="margin-top: 10px; padding: 12px; background: white; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                <div style="font-weight: bold; color: #8b0000; margin-bottom: 8px; font-size: 13px;">剧本自制规则</div>
                                <div style="font-size: 11px; line-height: 1.4; color: #333;">
                                    ${bootleggerRulesArray.map(rule => {
                                        const parts = rule.split(' - ');
                                        if (parts.length > 1) {
                                            return `<div style="margin-bottom: 4px;"><b style="color: #8b0000;">${parts[0]}</b> - ${parts.slice(1).join(' - ')}</div>`;
                                        } else {
                                            return `<div style="margin-bottom: 4px;">${rule}</div>`;
                                        }
                                    }).join('')}
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- 底部注释 -->
                        </div>
                    `;
                } else {
                    // 方案一：经典布局 - 标题在上，夜间顺序在两侧
                    scriptHtml = `
                        <div style="display: flex; flex-direction: column; height: 100%; position: relative; max-width: 100%; box-sizing: border-box;">
                            <!-- 顶部区域：标题和玩家数量表格 -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; max-width: 100%; box-sizing: border-box;">
                                ${titleSection}
                                ${configSection}
                            </div>
                            
                            <!-- 中间主体区域 -->
                            ${rolesSection}
                            
                            ${statusAndRulesSection}
                            
                            <!-- 底部注释 -->
                            <div style="position: absolute; bottom: 5px; ${showStatusBar ? 'right: 10px;' : 'left: 50%; transform: translateX(-50%);'}; font-size: 10px; color: #333; font-weight: bold;">*指非首个夜晚</div>
                        </div>
                    `;
                }
                
                // 组装完整的剧本图HTML
                scriptPage.innerHTML = scriptHtml;
                
                // 调整预览容器尺寸以匹配下载时的尺寸
                setTimeout(() => {
                    // 临时移除max-height和overflow限制以获取完整内容
                    const originalMaxHeight = scriptPage.style.maxHeight;
                    const originalOverflowY = scriptPage.style.overflowY;
                    
                    scriptPage.style.maxHeight = 'none';
                    scriptPage.style.overflowY = 'visible';
                    
                    // 根据内容计算实际高度
                    const fullHeight = scriptPage.scrollHeight;
                    
                    // 只设置高度，保持宽度不变
                    scriptPage.style.height = fullHeight + 'px';
                    
                    // 恢复原始样式
                    scriptPage.style.maxHeight = originalMaxHeight;
                    scriptPage.style.overflowY = originalOverflowY;
                }, 100);
                
                // 创建按钮容器 - 悬浮在屏幕正中
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: flex;
                    gap: 12px;
                    z-index: 10001;
                    padding: 15px 20px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    justify-content: center;
                    flex-shrink: 0;
                `;
                
                // 下载按钮
                const downloadButton = document.createElement('button');
                downloadButton.innerHTML = '下载图片';
                downloadButton.style.cssText = `
                    padding: ${isMobile ? '15px 25px' : '10px 20px'};
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: ${isMobile ? '12px' : '8px'};
                    cursor: pointer;
                    font-size: ${isMobile ? '16px' : '14px'};
                    font-weight: 500;
                    min-height: ${isMobile ? '50px' : 'auto'};
                    min-width: ${isMobile ? '120px' : 'auto'};
                    touch-action: manipulation;
                `;
                downloadButton.onclick = function() {
                    // 保存原始样式
                    const originalMaxHeight = scriptPage.style.maxHeight;
                    const originalOverflowY = scriptPage.style.overflowY;
                    const originalWidth = scriptPage.style.width;
                    const originalHeight = scriptPage.style.height;
                    
                    // 临时移除max-height和overflow限制以获取完整内容
                    scriptPage.style.maxHeight = 'none';
                    scriptPage.style.overflowY = 'visible';
                    
                    // 等待DOM更新后获取完整尺寸
                    setTimeout(() => {
                        const fullHeight = scriptPage.scrollHeight;
                        const fullWidth = scriptPage.scrollWidth;
                        
                        // 强制使用纵向A4比例（宽:高 = 1:1.414）
                        const a4Ratio = 1.414; // A4纵向比例（高/宽 = 297/210）
                        
                        // 计算画布尺寸：以内容宽度为基准，按A4比例计算高度
                        let finalWidth = fullWidth;
                        let finalHeight = finalWidth * a4Ratio;
                        
                        // 如果计算的高度不够容纳内容，使用内容高度并重新计算宽度
                        if (finalHeight < fullHeight) {
                            finalHeight = fullHeight;
                            finalWidth = finalHeight / a4Ratio;
                        }
                        
                        // 输出调试日志
                        console.log('=== 方案二下载调试日志 ===');
                        console.log('内容实际高度:', fullHeight, 'px');
                        console.log('内容实际宽度:', fullWidth, 'px');
                        console.log('A4方向: 纵向');
                        console.log('最终宽度:', Math.round(finalWidth), 'px');
                        console.log('最终高度:', Math.round(finalHeight), 'px');
                        console.log('最终比例 (高:宽):', (finalHeight / finalWidth).toFixed(3));
                        console.log('==========================');
                        
                        // 设置容器尺寸为纵向A4比例尺寸
                        scriptPage.style.width = finalWidth + 'px';
                        scriptPage.style.height = finalHeight + 'px';
                        
                        html2canvas(scriptPage, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: hexToRgba(customBgColor, bgOpacity),
                            windowWidth: finalWidth,
                            windowHeight: finalHeight
                        }).then(function(canvas) {
                            // 恢复原始样式
                            scriptPage.style.maxHeight = originalMaxHeight;
                            scriptPage.style.overflowY = originalOverflowY;
                            scriptPage.style.width = originalWidth;
                            scriptPage.style.height = originalHeight;
                            
                            // 使用更兼容移动端的下载方式
                            const dataUrl = canvas.toDataURL('image/png');
                            const filename = editionName + '_剧本图.png';
                            
                            // 检测是否为移动端
                            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                            
                            // 优化移动端下载逻辑
                            if (isMobile) {
                                // 方案1：尝试使用Blob对象和download属性
                                try {
                                    const blob = dataURLToBlob(dataUrl);
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    link.style.display = 'none';
                                    
                                    // 添加到文档并触发点击
                                    document.body.appendChild(link);
                                    
                                    // 移动端需要模拟真实点击
                                    if (navigator.userAgent.match(/iPad|iPhone|iPod/)) {
                                        // iOS设备特殊处理
                                        const event = document.createEvent('MouseEvents');
                                        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                                        link.dispatchEvent(event);
                                    } else {
                                        // Android设备
                                        link.click();
                                    }
                                    
                                    setTimeout(() => {
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                    }, 100);
                                    
                                    // 提示用户
                                    setTimeout(() => {
                                        alert('请在弹出的下载提示中选择保存图片');
                                    }, 500);
                                } catch (e) {
                                    console.error('Blob下载失败:', e);
                                    // 方案2：在新窗口打开图片，让用户长按保存
                                    const newWindow = window.open();
                                    if (newWindow) {
                                        newWindow.document.write('<html><head><title>' + filename + '</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#f0f0f0;"><img src="' + dataUrl + '" style="max-width:100%;height:auto;" onclick="window.close()"></body></html>');
                                        newWindow.document.close();
                                        alert('图片已在新窗口打开，请长按图片保存到相册');
                                    } else {
                                        // 方案3：显示错误提示
                                        alert('无法自动下载图片，请截图保存');
                                    }
                                }
                            } else {
                                // 桌面端：直接下载
                                const link = document.createElement('a');
                                link.download = filename;
                                link.href = dataUrl;
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();
                                setTimeout(() => {
                                    document.body.removeChild(link);
                                }, 100);
                            }
                        }).catch(function(error) {
                            console.error('生成图片失败:', error);
                            alert('生成图片失败，请重试');
                            // 恢复原始样式
                            scriptPage.style.maxHeight = originalMaxHeight;
                            scriptPage.style.overflowY = originalOverflowY;
                            scriptPage.style.width = originalWidth;
                            scriptPage.style.height = originalHeight;
                        });
                    }, 100);
                };
                buttonContainer.appendChild(downloadButton);
                
                // 关闭按钮
                const closeButton = document.createElement('button');
                closeButton.innerHTML = '关闭';
                closeButton.style.cssText = `
                    padding: ${isMobile ? '15px 25px' : '10px 20px'};
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    color: white;
                    border: none;
                    border-radius: ${isMobile ? '12px' : '8px'};
                    cursor: pointer;
                    font-size: ${isMobile ? '16px' : '14px'};
                    font-weight: 500;
                    min-height: ${isMobile ? '50px' : 'auto'};
                    min-width: ${isMobile ? '120px' : 'auto'};
                    touch-action: manipulation;
                `;
                closeButton.onclick = function() {
                    document.body.removeChild(previewContainer);
                };
                buttonContainer.appendChild(closeButton);
                
                // 先添加按钮容器，再添加剧本图页面，让按钮显示在上方
                previewContainer.appendChild(buttonContainer);
                previewContainer.appendChild(scriptPage);
                document.body.appendChild(previewContainer);
                
            } catch (error) {
                alert('生成剧本图失败，请检查角色数据');
                console.error('生成剧本图错误:', error);
            } finally {
                isGeneratingScriptImage = false;
            }
        }

async function generateJinxAndConfigImage() {
            try {
                // 获取剧本基本信息
                const scriptName = metaInfoJson.name || '未知剧本';
                
                // 获取字号设置
                const fontSizeInput = document.getElementById('font-size-setting');
                const fontSize = fontSizeInput?.value || 'small';
                const fontSizeMultiplier = fontSize === 'large' ? 1.2 : 1.0;
                
                // 获取背景颜色设置
                const detailBgColor = document.getElementById('bg-color-setting')?.value || '#f6f6f4';
                const detailBgOpacity = parseInt(document.getElementById('bg-opacity-setting')?.value || '100') / 100;
                
                // 获取其他夜晚顺序倒序设置
                const reverseOtherNight = document.getElementById('reverseOtherNight')?.checked ?? false;
                
                // 获取当前选中的角色
                const allRoles = [...getSelectedRoles(), ...dirRolesJson];
                const roleNames = allRoles.map(role => role.name);
                
                // 获取相克规则
                const getJinxRulesForPreview = () => {
                    const jinxRules = [];
                    if (typeof jinxes !== 'undefined') {
                        jinxes.forEach(rule => {
                            if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                                jinxRules.push(rule);
                            }
                        });
                    }
                    if (typeof userAddedJinxRules !== 'undefined') {
                        userAddedJinxRules.forEach(rule => {
                            if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                                jinxRules.push(rule);
                            }
                        });
                    }
                    if (typeof window.jinxes !== 'undefined') {
                        window.jinxes.forEach(rule => {
                            if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                                jinxRules.push(rule);
                            }
                        });
                    }
                    if (typeof window.trialJinxes !== 'undefined') {
                        window.trialJinxes.forEach(rule => {
                            if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                                jinxRules.push(rule);
                            }
                        });
                    }
                    if (typeof trialJinxes !== 'undefined') {
                        trialJinxes.forEach(rule => {
                            if (roleNames.includes(rule.jinxRole1) && roleNames.includes(rule.jinxRole2)) {
                                jinxRules.push(rule);
                            }
                        });
                    }
                    return jinxRules;
                };
                
                const jinxRules = getJinxRulesForPreview();
                
                // 过滤出旅行者和传奇角色
                const travellerRoles = allRoles.filter(role =>
                    role.team === 'traveller' || role.team === '旅行者'
                );
                const fabledRoles = allRoles.filter(role =>
                    role.team === 'fabled' || role.team === '传奇角色'
                );
                
                // 获取自制规则
                const bootleggerRules = Array.isArray(metaInfoJson.bootlegger) ? metaInfoJson.bootlegger : (metaInfoJson.bootlegger ? [metaInfoJson.bootlegger] : []);
                
                // 获取首夜和其他夜晚顺序 - 添加黄昏、爪牙、恶魔等元信息
                // 优先使用metaInfoJson中的夜间顺序数组
                let firstNightRoles = [];
                let otherNightRoles = [];
                
                // 创建角色名称映射，将旧角色名映射到新角色名
                const roleNameMap = {
                    "旧小怪宝": "小怪宝",
                    "旧麻风病人": "麻风病人",
                    "旧赌徒": "赌徒",
                    "旧卖花女孩": "卖花女孩",
                    "旧掘墓人": "掘墓人",
                    "旧守鸦人": "守鸦人",
                    "旧刺客": "刺客",
                    "旧下毒者": "下毒者",
                    "旧女巫": "女巫",
                    "旧洗脑师": "洗脑师",
                    "旧恐惧之灵": "恐惧之灵",
                    "旧鹰身女妖": "鹰身女妖",
                    "旧灵言师": "灵言师",
                    "旧狐媚娘": "狐媚娘",
                    "旧普卡": "普卡",
                    "旧牙噶巴卜": "牙噶巴卜",
                    "旧酿酒师": "酿酒师",
                    "旧俑匠": "俑匠",
                    "旧熊孩子": "熊孩子",
                    "旧小精灵": "小精灵",
                    "旧巡山人": "巡山人",
                    "旧洗衣妇": "洗衣妇",
                    "旧图书管理员": "图书管理员",
                    "旧调查员": "调查员",
                    "旧厨师": "厨师",
                    "旧共情者": "共情者",
                    "旧占卜师": "占卜师",
                    "旧管家": "管家",
                    "旧逆臣": "逆臣",
                    "旧祖母": "祖母",
                    "旧钟表匠": "钟表匠",
                    "旧筑梦师": "筑梦师",
                    "旧女裁缝": "女裁缝",
                    "旧事务官": "事务官",
                    "旧骑士": "骑士",
                    "旧贵族": "贵族",
                    "旧气球驾驶员": "气球驾驶员",
                    "旧阴阳师": "阴阳师",
                    "旧郎中": "郎中",
                    "旧店小二": "店小二",
                    "旧村夫": "村夫",
                    "旧赏金猎人": "赏金猎人",
                    "旧守夜人": "守夜人",
                    "旧异教领袖": "异教领袖",
                    "旧间谍": "间谍",
                    "旧食人魔": "食人魔",
                    "旧女祭司": "女祭司",
                    "旧修行者": "修行者",
                    "旧钦天监": "钦天监",
                    "旧将军": "将军",
                    "旧方士": "方士",
                    "旧侍女": "侍女",
                    "旧引路人": "引路人",
                    "旧数学家": "数学家",
                    "旧利维坦": "利维坦",
                    "旧维齐尔": "维齐尔",
                    "旧哈迪寂亚": "哈迪寂亚",
                    "旧画皮": "画皮",
                    "旧痢蛭": "痢蛭",
                    "旧暴乱": "暴乱",
                    "旧国王": "国王",
                    "旧农夫": "农夫",
                    "旧戏法师": "戏法师",
                    "旧半兽人": "半兽人",
                    "旧炼金术士": "炼金术士",
                    "旧瘟疫医生": "瘟疫医生",
                    "旧麻脸巫婆": "麻脸巫婆",
                    "旧街头风琴手": "街头风琴手",
                    "旧炸弹人": "炸弹人",
                    "旧姑获鸟": "姑获鸟"
                };
                
                // 定义特殊角色映射
                const specialRolesMap = {
                    'twilight': { firstNight: 0, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.jpg' },
                    'minioninfo': { firstNight: 2000, name: '爪牙信息', image: 'images/180px-Mi.png' },
                    'demoninfo': { firstNight: 3000, name: '恶魔信息', image: 'images/180px-Di.png' },
                    'dawn': { firstNight: 9999, name: '黎明', image: 'images/dawn.jpg' }
                };
                
                // 处理首夜顺序
                if (metaInfoJson.firstNight && metaInfoJson.firstNight.length > 0 && metaInfoJson.firstNight[0] !== "") {
                    // 使用metaInfoJson中的首夜顺序
                    metaInfoJson.firstNight.forEach((roleId, index) => {
                        // 检查是否是特殊角色
                        if (specialRolesMap[roleId]) {
                            firstNightRoles.push({ ...specialRolesMap[roleId], firstNight: index + 1 });
                            return;
                        }
                        // 查找角色信息
                        let role = allRoles.find(r => r.id === roleId);
                        // 如果没找到，尝试使用旧角色名映射
                        if (!role) {
                            const newName = roleNameMap[roleId];
                            if (newName) {
                                role = allRoles.find(r => r.name === newName);
                            }
                        }
                        if (role) {
                            firstNightRoles.push({ ...role, firstNight: index + 1 });
                        }
                    });
                } else {
                    // 使用角色自身的firstNight属性
                    firstNightRoles = allRoles.filter(role => role.firstNight > 0).sort((a, b) => a.firstNight - b.firstNight);
                }
                
                // 处理其他夜晚顺序
                if (metaInfoJson.otherNight && metaInfoJson.otherNight.length > 0 && metaInfoJson.otherNight[0] !== "") {
                    // 使用metaInfoJson中的他夜顺序
                    metaInfoJson.otherNight.forEach((roleId, index) => {
                        // 检查是否是特殊角色
                        if (specialRolesMap[roleId]) {
                            otherNightRoles.push({ ...specialRolesMap[roleId], otherNight: index + 1 });
                            return;
                        }
                        // 查找角色信息
                        let role = allRoles.find(r => r.id === roleId);
                        // 如果没找到，尝试使用旧角色名映射
                        if (!role) {
                            const newName = roleNameMap[roleId];
                            if (newName) {
                                role = allRoles.find(r => r.name === newName);
                            }
                        }
                        if (role) {
                            otherNightRoles.push({ ...role, otherNight: index + 1 });
                        }
                    });
                } else {
                    // 使用角色自身的otherNight属性
                    otherNightRoles = allRoles.filter(role => role.otherNight > 0).sort((a, b) => a.otherNight - b.otherNight);
                }
                
                // 添加元信息图标到首夜顺序（黄昏、爪牙信息、恶魔信息、黎明）
                let metaFirstNight, metaOtherNight;
                
                if (metaInfoJson.firstNight && metaInfoJson.firstNight.length > 0 && metaInfoJson.firstNight[0] !== "") {
                    // 使用metaInfoJson中的顺序时，只添加黄昏和黎明
                    metaFirstNight = [
                        { firstNight: -100, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.png' },
                        { firstNight: 12700, name: '黎明', image: 'images/dawn.png' }
                    ];
                } else {
                    // 使用默认顺序时，添加所有元信息图标
                    metaFirstNight = [
                        { firstNight: -100, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.png' },
                        { firstNight: 2000, name: '爪牙信息', image: 'images/180px-Mi.png' },
                        { firstNight: 3000, name: '恶魔信息', image: 'images/180px-Di.png' },
                        { firstNight: 12700, name: '黎明', image: 'images/dawn.png' }
                    ];
                }
                
                if (metaInfoJson.otherNight && metaInfoJson.otherNight.length > 0 && metaInfoJson.otherNight[0] !== "") {
                    // 使用metaInfoJson中的顺序时，只添加黄昏和黎明
                    metaOtherNight = [
                        { otherNight: -100, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.png' },
                        { otherNight: 15000, name: '黎明', image: 'images/dawn.png' }
                    ];
                } else {
                    // 使用默认顺序时，添加所有元信息图标
                    metaOtherNight = [
                        { otherNight: -100, name: '黄昏', image: 'images/dusk-CLd-DXn-QC.png' },
                        { otherNight: 15000, name: '黎明', image: 'images/dawn.png' }
                    ];
                }
                
                // 合并首夜顺序
                const allFirstNight = [...firstNightRoles, ...metaFirstNight].sort((a, b) => {
                    const orderA = a.firstNight || 0;
                    const orderB = b.firstNight || 0;
                    return orderA - orderB;
                });
                
                // 合并他夜顺序
                const allOtherNight = [...otherNightRoles, ...metaOtherNight].sort((a, b) => {
                    const orderA = a.otherNight || 0;
                    const orderB = b.otherNight || 0;
                    return orderA - orderB;
                });
                
                // 去重，确保每个角色只出现一次
                const uniqueFirstNight = [];
                const seenFirstNight = new Set();
                allFirstNight.forEach(role => {
                    if (!seenFirstNight.has(role.name)) {
                        seenFirstNight.add(role.name);
                        uniqueFirstNight.push(role);
                    }
                });
                
                const uniqueOtherNight = [];
                const seenOtherNight = new Set();
                allOtherNight.forEach(role => {
                    if (!seenOtherNight.has(role.name)) {
                        seenOtherNight.add(role.name);
                        uniqueOtherNight.push(role);
                    }
                });
                
                // 更新夜间顺序
                firstNightRoles = uniqueFirstNight;
                otherNightRoles = uniqueOtherNight;
                
                // 排序夜间顺序
                firstNightRoles = firstNightRoles.filter(role => role && role.firstNight !== undefined).sort((a, b) => a.firstNight - b.firstNight);
                otherNightRoles = otherNightRoles.filter(role => role && role.otherNight !== undefined).sort((a, b) => a.otherNight - b.otherNight);
                
                // 检测是否为移动端
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                
                // 创建预览容器
                const previewContainer = document.createElement('div');
                previewContainer.id = 'detail-image-preview';
                previewContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    z-index: 10000;
                    padding: ${isMobile ? '10px' : '20px'};
                    box-sizing: border-box;
                    overflow: auto;
                `;
                
                // 创建打印页面容器 - 与剧本图保持一致的A4尺寸
                const printPage = document.createElement('div');
                printPage.style.cssText = `
                    width: ${isMobile ? '520px' : '8.27in'};
                    height: ${isMobile ? '870px' : '11.69in'};
                    padding: ${isMobile ? '10px' : '0.3in'};
                    margin: ${isMobile ? '0' : '0 auto'};
                    background: ${hexToRgba(detailBgColor, detailBgOpacity)};
                    box-sizing: border-box;
                    position: relative;
                    overflow: auto;
                    font-family: 'Assistant', 'Microsoft YaHei', sans-serif;
                    flex-shrink: 0;
                `;
                
                // 固定A4尺寸，移动端不需要
                if (!isMobile) {
                    printPage.style.width = '8.27in';
                    printPage.style.height = '11.69in';
                }
                
                // 直接使用已经处理好的夜间顺序
                const allFirstNightRoles = firstNightRoles;
                const allOtherNightRoles = otherNightRoles;
                
                // 构建首夜顺序HTML（左侧）
                const firstNightHtml = allFirstNightRoles.map(role => `
                    <img src="${convertToLocalPath(role.image)}" style="width: 45px; height: 45px; margin: -5px 0; object-fit: cover; display: block;">
                `).join('');
                
                // 构建其他夜晚顺序HTML（右侧）
                const otherNightHtml = allOtherNightRoles.map(role => `
                    <img src="${convertToLocalPath(role.image)}" style="width: 45px; height: 45px; margin: -5px 0; object-fit: cover; display: block; transform: rotate(180deg);">
                `).join('');
                
                // 构建剧本标题（顶部居中）
                const scriptNameHtml = `
                    <div style="font-family: 'Philo', serif; font-size: 34px; text-align: center; color: #800000; margin: 20px 0 30px 0; position: relative; font-weight: bold;">
                        ${scriptName}
                    </div>
                `;
                
                // 构建Fabled/Loric标题区域
                const showFabled = fabledRoles.length > 0;
                const fabledHeaderHtml = showFabled ? `
                    <div style="margin: 0 auto; width: 98%; height: 40px; position: relative; bottom: -10px; left: 15px;">
                        <div style="background: black; width: 96%; height: 1px;"></div>
                        <div style="font-family: 'Philo', serif; width: 140px; position: relative; top: -17px; right: 10px; font-size: 5mm; color: black; background-color: white; margin: 0 auto; display: flex; justify-content: center;">
                            传奇角色
                        </div>
                    </div>
                ` : '';
                
                // 构建Fabled角色HTML - 使用npcRow样式
                const fabledHtml = fabledRoles.map(role => `
                    <div style="display: flex; flex-direction: row; position: relative; bottom: -10px; margin: -10px 0;">
                        <div style="float: left; align-items: center;">
                            <img src="${convertToLocalPath(role.image)}" height="60" style="object-fit: cover;">
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; min-height: 60px;">
                            <b style="font-family: 'Philo', serif; float: left; font-size: 4mm; position: relative; bottom: -5px; color: #7a6550;">${role.name}</b>
                            <p style="font-family: 'Assistant', sans-serif; float: right; font-size: 3.4mm; line-height: 1.2; align-items: right; position: relative; bottom: -3px; margin: 0;">${role.ability || ''}</p>
                        </div>
                    </div>
                `).join('');
                
                // 构建相克规则HTML（使用djinn图标）
                const jinxHtml = jinxRules.length > 0 ? `
                    <div style="display: flex; flex-direction: row; position: relative; bottom: -10px; margin: -10px 0;">
                        <img src="images/djinn.png" height="${60 * fontSizeMultiplier}" style="object-fit: cover;">
                    </div>
                    ${jinxRules.map(rule => `
                        <div style="display: flex; flex-direction: row; align-items: center; height: ${50 * fontSizeMultiplier}px; position: relative; bottom: 4px; margin: -5px 0 0 0;">
                            <b style="padding-right: 30px;"></b>
                            <img src="${convertToLocalPath(allRoles.find(r => r.name === rule.jinxRole1)?.image || '')}" style="float: left; height: ${40 * fontSizeMultiplier}px; position: relative; bottom: -10px; margin: 0 -5px 0 0;">
                            <img src="${convertToLocalPath(allRoles.find(r => r.name === rule.jinxRole2)?.image || '')}" style="float: left; height: ${40 * fontSizeMultiplier}px; position: relative; bottom: -10px; margin: 0 -5px 0 0;">
                            <p style="font-family: 'Assistant', sans-serif; font-size: ${3.4 * fontSizeMultiplier}mm; padding-left: 10px; position: relative; bottom: -20px; margin: 0;">${rule.jinxRule}</p>
                        </div>
                    `).join('')}
                ` : '';
                
                // 构建私货商人规则HTML
                const bootleggerHtml = bootleggerRules.length > 0 ? `
                    <div style="display: flex; flex-direction: row; position: relative; bottom: -10px; margin: -10px 0;">
                        <img src="images/Bootlegger.png" height="${60 * fontSizeMultiplier}" style="object-fit: cover;">
                    </div>
                    ${bootleggerRules.map(rule => `
                        <div style="display: flex; flex-direction: row; align-items: flex-start; margin: -20px 0 -15px 0;">
                            <b style="padding-right: 70px;"></b>
                            <p style="margin: 0; flex-shrink: 0;">⦁</p>
                            <p style="font-family: 'Assistant', sans-serif; font-size: ${3.4 * fontSizeMultiplier}mm; padding-left: 10px; padding-top: 0px; margin: 0; flex: 1; word-wrap: break-word; line-height: 1.3;">${rule}</p>
                        </div>
                    `).join('')}
                ` : '';
                
                // 构建旅行者标题区域
                const travellerHeaderHtml = travellerRoles.length > 0 ? `
                    <div style="margin: 0 auto; width: 98%; height: ${40 * fontSizeMultiplier}px; position: relative; bottom: -10px; left: 15px;">
                        <div style="background: black; width: 96%; height: 1px;"></div>
                        <div style="font-family: 'Philo', serif; width: ${140 * fontSizeMultiplier}px; position: relative; top: -17px; right: 10px; font-size: ${5 * fontSizeMultiplier}mm; color: black; background-color: white; margin: 0 auto; display: flex; justify-content: center;">
                            旅行者
                        </div>
                    </div>
                ` : '';
                
                // 构建旅行者角色HTML
                const travellerListHtml = travellerRoles.map(role => `
                    <div style="display: flex; flex-direction: row; position: relative; bottom: -10px; margin: -10px 0;">
                        <div style="float: left; align-items: center;">
                            <img src="${convertToLocalPath(role.image)}" height="${60 * fontSizeMultiplier}" style="object-fit: cover;">
                        </div>
                        <div style="display: flex; flex-direction: column; justify-content: center; min-height: ${60 * fontSizeMultiplier}px;">
                            <b style="font-family: 'Philo', serif; float: left; font-size: ${4 * fontSizeMultiplier}mm; position: relative; bottom: -5px; color: #500050;">${role.name}</b>
                            <p style="font-family: 'Assistant', sans-serif; float: right; font-size: ${3.4 * fontSizeMultiplier}mm; line-height: 1.2; align-items: right; position: relative; bottom: -3px; margin: 0;">${role.ability || ''}</p>
                        </div>
                    </div>
                `).join('');
                
                // 构建玩家数量表格HTML
                const playerCountHtml = `
                    <div style="margin: 20px auto 0; text-align: center; max-width: 100%;">
                        <img src="https://i.postimg.cc/021k6s9F/playercount.png" style="width: ${isMobile ? '100%' : 620 * fontSizeMultiplier}px; max-width: 100%; height: auto;">
                    </div>
                `;
                
                // 构建底部角色图标行
                const townsfolkRolesList = allRoles.filter(r => r.team === 'townsfolk' || r.team === '镇民');
                const outsiderRolesList = allRoles.filter(r => r.team === 'outsider' || r.team === '外来者');
                const minionRolesList = allRoles.filter(r => r.team === 'minion' || r.team === '爪牙');
                const demonRolesList = allRoles.filter(r => r.team === 'demon' || r.team === '恶魔');
                
                const charBottomHtml = `
                    <div style="text-align: center; display: table; margin-left: auto; margin-right: auto; max-width: 100%; width: ${isMobile ? '100%' : 620 * fontSizeMultiplier}px; border: ${4 * fontSizeMultiplier}px solid rgba(201, 192, 184); margin-top: -2px; position: relative; z-index: 1; box-sizing: border-box;">
                        <div style="display: flex; flex-direction: row; flex-wrap: wrap; justify-content: center; align-items: center; padding: ${4 * fontSizeMultiplier}px 0; box-sizing: border-box; overflow: hidden;">
                            ${townsfolkRolesList.map(role => `
                                <img src="${convertToLocalPath(role.image)}" style="height: ${29 * fontSizeMultiplier}px; width: ${29 * fontSizeMultiplier}px; margin: 0px -5px 0px 0px; filter: grayscale(0%); flex-shrink: 0;">
                            `).join('')}
                            ${outsiderRolesList.map(role => `
                                <img src="${convertToLocalPath(role.image)}" style="height: ${29 * fontSizeMultiplier}px; width: ${29 * fontSizeMultiplier}px; margin: 0px -5px 0px 0px; filter: grayscale(0%); flex-shrink: 0;">
                            `).join('')}
                            ${minionRolesList.map(role => `
                                <img src="${convertToLocalPath(role.image)}" style="height: ${29 * fontSizeMultiplier}px; width: ${29 * fontSizeMultiplier}px; margin: 0px -5px 0px 0px; filter: grayscale(0%); flex-shrink: 0;">
                            `).join('')}
                            ${demonRolesList.map(role => `
                                <img src="${convertToLocalPath(role.image)}" style="height: ${29 * fontSizeMultiplier}px; width: ${29 * fontSizeMultiplier}px; margin: 0px -5px 0px 0px; filter: grayscale(0%); flex-shrink: 0;">
                            `).join('')}
                        </div>
                    </div>
                `;
                
                // 组装完整的细节图HTML - 模仿剧本图的布局样式
                printPage.innerHTML = `
                    <div style="display: flex; flex-direction: column; height: 100%; position: relative; max-width: 100%; box-sizing: border-box;">
                        <!-- 顶部区域：剧本标题 -->
                        <div style="display: flex; justify-content: center; margin-bottom: 20px; padding-top: 10px;">
                            <div style="font-family: 'Philo', serif; font-size: ${34 * fontSizeMultiplier}px; text-align: center; color: #800000; font-weight: bold;">
                                ${scriptName}
                            </div>
                        </div>
                        
                        <!-- 中间主体区域 -->
                        <div style="display: flex; flex: 1; position: relative; max-width: 100%; box-sizing: border-box; margin: 0 ${isMobile ? '10px' : '20px'};">
                            <!-- 左侧首夜顺序 -->
                            <div style="width: ${isMobile ? 20 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; display: flex; flex-direction: column; align-items: center; padding-right: 5px;">
                                ${firstNightHtml}
                                <div style="font-family: 'Philo', serif; font-size: ${10 * fontSizeMultiplier}px; padding: 5px 0; color: #333; font-weight: bold; line-height: 1.5; white-space: pre;">首<br>夜</div>
                            </div>
                            
                            <!-- 左侧分割线（首夜） -->
                            <div style="display: flex; flex-direction: column; align-items: center; padding: 0 2px;">
                                <div style="flex: 1; width: 1px; background: #333;"></div>
                                <div style="flex: 1; width: 1px; background: #333;"></div>
                            </div>
                            
                            <!-- 中间内容区域 -->
                            <div style="flex: 1; padding: 0 10px; max-width: 100%; box-sizing: border-box;">
                                <!-- 传奇角色 -->
                                ${fabledRoles.length > 0 ? `
                                    <div style="margin-bottom: 20px;">
                                        <div style="font-family: 'Philo', serif; font-size: 16px; font-weight: bold; color: #7a6550; padding-bottom: 3px; margin-bottom: 10px; display: flex; align-items: center;">
                                            <span>传奇角色</span>
                                            <div style="flex: 1; height: 1px; background: #7a6550; margin-left: 10px;"></div>
                                        </div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                            ${fabledRoles.map(role => `
                                                <div style="flex: 0 1 ${isMobile ? '100%' : 'calc(50% - 10px)'} ; min-width: ${isMobile ? '100%' : '250px'}; max-width: 100%; box-sizing: border-box;">
                                                    <div style="display: flex; align-items: flex-start;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: ${isMobile ? 50 : 60}px; height: ${isMobile ? 50 : 60}px; object-fit: cover; margin-right: 10px; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: ${13 * fontSizeMultiplier}px; color: #7a6550; margin-bottom: 2px;">${role.name}</div>
                                                            <div style="font-size: ${11 * fontSizeMultiplier}px; line-height: 1.3; color: #333;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- 相克规则 -->
                                ${jinxRules.length > 0 ? `
                                    <div style="margin-bottom: 20px;">
                                        <div style="font-family: 'Philo', serif; font-size: ${16 * fontSizeMultiplier}px; font-weight: bold; color: #760A0D; padding-bottom: 3px; margin-bottom: 10px; display: flex; align-items: center;">
                                            <span>相克规则</span>
                                            <div style="flex: 1; height: 1px; background: #760A0D; margin-left: 10px;"></div>
                                        </div>
                                        <div style="padding: 10px;">
                                            <!-- 灯神图标和说明 -->
                                            <div style="display: flex; align-items: flex-start; margin-bottom: 15px; gap: 10px;">
                                                <img src="images/djinn.png" style="width: ${isMobile ? 50 * fontSizeMultiplier : 60 * fontSizeMultiplier}px; height: ${isMobile ? 50 * fontSizeMultiplier : 60 * fontSizeMultiplier}px; object-fit: cover; flex-shrink: 0;">
                                                <div style="flex: 1;">
                                                    <div style="font-weight: bold; font-size: ${14 * fontSizeMultiplier}px; color: #760A0D; margin-bottom: 5px;">灯神</div>
                                                    <div style="font-size: ${11 * fontSizeMultiplier}px; line-height: 1.4; color: #333;">使用灯神的相克规则。所有玩家都会知道其内容。</div>
                                                </div>
                                            </div>
                                            <!-- 相克规则列表 -->
                                            ${jinxRules.map(rule => `
                                                <div style="margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px;">
                                                    <div style="display: flex; flex-direction: row; gap: 5px; flex-shrink: 0;">
                                                        <img src="${convertToLocalPath(allRoles.find(r => r.name === rule.jinxRole1)?.image || '')}" style="width: ${isMobile ? 30 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; height: ${isMobile ? 30 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; object-fit: cover; border-radius: 3px;">
                                                        <img src="${convertToLocalPath(allRoles.find(r => r.name === rule.jinxRole2)?.image || '')}" style="width: ${isMobile ? 30 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; height: ${isMobile ? 30 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; object-fit: cover; border-radius: 3px;">
                                                    </div>
                                                    <div style="flex: 1; font-size: ${11 * fontSizeMultiplier}px; line-height: 1.4; color: #333;">
                                                        ${rule.jinxRule}
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- 私货商人 -->
                                ${bootleggerRules.length > 0 ? `
                                    <div style="margin-bottom: 20px;">
                                        <div style="font-family: 'Philo', serif; font-size: ${16 * fontSizeMultiplier}px; font-weight: bold; color: #760A0D; padding-bottom: 3px; margin-bottom: 10px; display: flex; align-items: center;">
                                            <span>私货商人</span>
                                            <div style="flex: 1; height: 1px; background: #760A0D; margin-left: 10px;"></div>
                                        </div>
                                        <div style="padding: 10px;">
                                            <!-- 私货商人图标和标题 -->
                                            <div style="display: flex; align-items: center; margin-bottom: 10px; gap: 10px;">
                                                <img src="${fabledRoles.find(role => role.name.includes('私货商人'))?.image || 'images/Bootlegger.png'}" style="width: ${isMobile ? 30 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; height: ${isMobile ? 30 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; object-fit: cover; flex-shrink: 0;">
                                                <div style="font-weight: bold; font-size: ${14 * fontSizeMultiplier}px; color: #760A0D;">剧本自制规则</div>
                                            </div>
                                            <!-- 私货商人规则列表 -->
                                            <div style="margin-left: ${isMobile ? 40 : 50}px;">
                                                ${bootleggerRules.map(rule => `
                                                    <div style="margin-bottom: 6px; display: flex; align-items: flex-start; gap: 8px;">
                                                        <div style="flex-shrink: 0; margin-top: 2px; font-weight: bold;">•</div>
                                                        <div style="flex: 1; font-size: ${11 * fontSizeMultiplier}px; line-height: 1.4; color: #333;">
                                                            ${rule}
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- 旅行者 -->
                                ${travellerRoles.length > 0 ? `
                                    <div style="margin-bottom: 20px;">
                                        <div style="font-family: 'Philo', serif; font-size: 16px; font-weight: bold; color: #500050; padding-bottom: 3px; margin-bottom: 10px; display: flex; align-items: center;">
                                            <span>旅行者</span>
                                            <div style="flex: 1; height: 1px; background: #500050; margin-left: 10px;"></div>
                                        </div>
                                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                            ${travellerRoles.map(role => `
                                                <div style="flex: 0 1 ${isMobile ? '100%' : 'calc(50% - 10px)'} ; min-width: ${isMobile ? '100%' : '250px'}; max-width: 100%; box-sizing: border-box;">
                                                    <div style="display: flex; align-items: flex-start;">
                                                        <img src="${convertToLocalPath(role.image)}" style="width: ${isMobile ? 50 : 60}px; height: ${isMobile ? 50 : 60}px; object-fit: cover; margin-right: 10px; flex-shrink: 0;">
                                                        <div style="flex: 1; min-width: 0;">
                                                            <div style="font-weight: bold; font-size: ${13 * fontSizeMultiplier}px; color: #500050; margin-bottom: 2px;">${role.name}</div>
                                                            <div style="font-size: ${11 * fontSizeMultiplier}px; line-height: 1.3; color: #333;">${role.ability || ''}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <!-- 右侧分割线（他夜） -->
                            <div style="display: flex; flex-direction: column; align-items: center; padding: 0 2px;">
                                <div style="flex: 1; width: 1px; background: #333;"></div>
                                <div style="flex: 1; width: 1px; background: #333;"></div>
                            </div>
                            
                            <!-- 右侧其他夜顺序 -->
                            <div style="width: ${isMobile ? 20 * fontSizeMultiplier : 40 * fontSizeMultiplier}px; display: flex; flex-direction: ${!reverseOtherNight ? 'column' : 'column-reverse'}; align-items: center; padding-left: 5px;">
                                ${otherNightHtml}
                                <div style="font-family: 'Philo', serif; font-size: ${10 * fontSizeMultiplier}px; padding: 5px 0; color: #333; font-weight: bold; line-height: 1.5; white-space: pre;${!reverseOtherNight ? '' : ' transform: rotate(180deg);'}">他<br>夜</div>
                            </div>
                        </div>
                        
                        <!-- 底部区域 -->
                        <div style="margin-top: 20px; padding-bottom: 10px;">
                            <!-- 玩家数量表格 -->
                            ${playerCountHtml}
                            
                            <!-- 底部角色图标行 -->
                            ${charBottomHtml}
                        </div>
                    </div>
                `;
                
                // 创建按钮容器 - 悬浮在屏幕正中
                const buttonContainer = document.createElement('div');
                buttonContainer.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    display: flex;
                    gap: 12px;
                    z-index: 10001;
                    padding: 15px 20px;
                    background: rgba(255, 255, 255, 0.95);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    justify-content: center;
                    flex-shrink: 0;
                `;
                
                // 下载按钮
                const downloadButton = document.createElement('button');
                downloadButton.innerHTML = '下载图片';
                downloadButton.style.cssText = `
                    padding: ${isMobile ? '15px 25px' : '10px 20px'};
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: ${isMobile ? '12px' : '8px'};
                    cursor: pointer;
                    font-size: ${isMobile ? '16px' : '14px'};
                    font-weight: 500;
                    min-height: ${isMobile ? '50px' : 'auto'};
                    min-width: ${isMobile ? '120px' : 'auto'};
                    touch-action: manipulation;
                `;
                downloadButton.onclick = function() {
                    // 保存原始样式
                    const originalWidth = printPage.style.width;
                    const originalHeight = printPage.style.height;
                    
                    // 临时移除高度限制，让内容完全显示
                    printPage.style.height = 'auto';
                    
                    // 等待DOM更新后获取完整尺寸
                    setTimeout(() => {
                        // 获取内容的实际高度
                        const fullHeight = printPage.scrollHeight;
                        const a4Width = 8.27 * 96; // 8.27英寸转换为像素（96dpi）
                        const a4Height = a4Width * 1.414; // A4比例（297/210）
                        
                        // 计算最终高度：取内容实际高度和A4比例高度的较大值
                        const finalHeight = Math.max(fullHeight, a4Height);
                        
                        // 设置容器尺寸，宽度固定为A4，高度保持A4比例
                        printPage.style.width = a4Width + 'px';
                        printPage.style.height = finalHeight + 'px';
                        
                        html2canvas(printPage, {
                            scale: 2,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: hexToRgba(detailBgColor, detailBgOpacity),
                            // 确保捕获整个内容
                            windowWidth: a4Width,
                            windowHeight: finalHeight
                        }).then(function(canvas) {
                            // 恢复原始样式
                            printPage.style.width = originalWidth;
                            printPage.style.height = originalHeight;
                            
                            // 使用更兼容移动端的下载方式
                            const dataUrl = canvas.toDataURL('image/png');
                            const filename = scriptName + '_细节图.png';
                            
                            // 检测是否为移动端
                            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                            
                            // 优化移动端下载逻辑
                            if (isMobile) {
                                // 方案1：尝试使用Blob对象和download属性
                                try {
                                    const blob = dataURLToBlob(dataUrl);
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    link.style.display = 'none';
                                    
                                    // 添加到文档并触发点击
                                    document.body.appendChild(link);
                                    
                                    // 移动端需要模拟真实点击
                                    if (navigator.userAgent.match(/iPad|iPhone|iPod/)) {
                                        // iOS设备特殊处理
                                        const event = document.createEvent('MouseEvents');
                                        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                                        link.dispatchEvent(event);
                                    } else {
                                        // Android设备
                                        link.click();
                                    }
                                    
                                    setTimeout(() => {
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(url);
                                    }, 100);
                                    
                                    // 提示用户
                                    setTimeout(() => {
                                        alert('请在弹出的下载提示中选择保存图片');
                                    }, 500);
                                } catch (e) {
                                    console.error('Blob下载失败:', e);
                                    // 方案2：在新窗口打开图片，让用户长按保存
                                    const newWindow = window.open();
                                    if (newWindow) {
                                        newWindow.document.write('<html><head><title>' + filename + '</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#f0f0f0;"><img src="' + dataUrl + '" style="max-width:100%;height:auto;" onclick="window.close()"></body></html>');
                                        newWindow.document.close();
                                        alert('图片已在新窗口打开，请长按图片保存到相册');
                                    } else {
                                        // 方案3：显示错误提示
                                        alert('无法自动下载图片，请截图保存');
                                    }
                                }
                            } else {
                                // 桌面端：直接下载
                                const link = document.createElement('a');
                                link.download = filename;
                                link.href = dataUrl;
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();
                                setTimeout(() => {
                                    document.body.removeChild(link);
                                }, 100);
                            }
                        }).catch(function(error) {
                            console.error('生成图片失败:', error);
                            alert('生成图片失败，请重试');
                            // 恢复原始样式
                            printPage.style.width = originalWidth;
                            printPage.style.height = originalHeight;
                        });
                    }, 100);
                };
                buttonContainer.appendChild(downloadButton);
                
                // 关闭按钮
                const closeButton = document.createElement('button');
                closeButton.innerHTML = '关闭';
                closeButton.style.cssText = `
                    padding: ${isMobile ? '15px 25px' : '10px 20px'};
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
                    color: white;
                    border: none;
                    border-radius: ${isMobile ? '12px' : '8px'};
                    cursor: pointer;
                    font-size: ${isMobile ? '16px' : '14px'};
                    font-weight: 500;
                    min-height: ${isMobile ? '50px' : 'auto'};
                    min-width: ${isMobile ? '120px' : 'auto'};
                    touch-action: manipulation;
                `;
                closeButton.onclick = function() {
                    document.body.removeChild(previewContainer);
                };
                buttonContainer.appendChild(closeButton);
                
                // 先添加按钮容器，再添加剧本图页面，让按钮显示在上方
                previewContainer.appendChild(buttonContainer);
                previewContainer.appendChild(printPage);
                document.body.appendChild(previewContainer);
                
            } catch (error) {
                alert('生成细节图失败，请检查角色数据');
                console.error('生成细节图错误:', error);
            }
        }



function toggleScriptConfig() {
            const content = document.getElementById('script-config-content');
            const toggle = document.getElementById('script-config-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.textContent = '▼';
            } else {
                content.style.display = 'none';
                toggle.textContent = '▶';
            }
        }

function toggleScriptConfigModal() {
            const existingModal = document.getElementById('script-config-modal');
            if (existingModal) {
                document.body.removeChild(existingModal);
                return;
            }
            
            const modal = document.createElement('div');
            modal.id = 'script-config-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 10000;';
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);';
            
            modalContent.innerHTML = `
                <h2 style="margin-top: 0; color: #6b46c1; margin-bottom: 24px;">🎨 剧本图设置</h2>
                
                <!-- 方案选择 -->
                <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f0f4ff 0%, #e8efff 100%); border-radius: 10px; border: 1px solid #d0d7ff;">
                    <h4 style="margin: 0 0 10px 0; color: #4f46e5; font-size: 14px; font-weight: bold;">布局方案</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid transparent; transition: all 0.2s;">
                            <input type="radio" name="scriptLayout" value="scheme1" style="width: 18px; height: 18px;">
                            <div>
                                <div style="font-weight: 600; color: #333;">方案一</div>
                                <div style="font-size: 12px; color: #666;">仿国外脚本布局</div>
                            </div>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 10px; background: white; border-radius: 8px; border: 2px solid transparent; transition: all 0.2s;">
                            <input type="radio" name="scriptLayout" value="scheme2" style="width: 18px; height: 18px;">
                            <div>
                                <div style="font-weight: 600; color: #333;">方案二</div>
                                <div style="font-size: 12px; color: #666;">自制彩色布局</div>
                            </div>
                        </label>
                    </div>
                </div>

                <!-- 显示选项 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px; font-weight: bold;">显示选项</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-showNightOrder" checked style="width: 16px; height: 16px;">
                            <span>显示夜间顺序</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-showConfigTable" checked style="width: 16px; height: 16px;">
                            <span>显示配置表</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-showCustomRules" style="width: 16px; height: 16px;">
                            <span>显示剧本自制规则</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-showTravellersFabled" checked style="width: 16px; height: 16px;">
                            <span>显示传奇和旅行者</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-showJinxRules" checked style="width: 16px; height: 16px;">
                            <span>显示相克规则</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-horizontalLayout" style="width: 16px; height: 16px;">
                            <span>角色横向排列</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" id="modal-reverseOtherNight" checked style="width: 16px; height: 16px;">
                            <span>其他夜晚顺序倒序（默认）</span>
                        </label>
                    </div>
                </div>

                <!-- 字号设置 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px; font-weight: bold;">字号设置</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="radio" name="fontSize" value="small" checked style="width: 16px; height: 16px;">
                            <span>小字号</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="radio" name="fontSize" value="large" style="width: 16px; height: 16px;">
                            <span>大字号</span>
                        </label>
                    </div>
                </div>

                <!-- 背景颜色设置 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px; font-weight: bold;">背景颜色</h4>
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <input type="color" id="modal-bg-color" value="#f6f6f4" style="width: 60px; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        <input type="text" id="modal-bg-color-text" value="#f6f6f4" style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px;" placeholder="输入颜色值，如 #f6f6f4 或 rgb(246, 246, 244)">
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <label style="font-size: 14px; color: #666; min-width: 60px;">透明度:</label>
                        <input type="range" id="modal-bg-opacity" min="0" max="100" value="100" style="flex: 1; cursor: pointer;">
                        <span id="modal-bg-opacity-value" style="font-size: 14px; color: #666; min-width: 40px; text-align: right;">100%</span>
                    </div>
                </div>

                <!-- 剧本标题图片 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px; font-weight: bold;">剧本标题图片（选填）</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 3px;">API密钥</label>
                            <input type="password" id="modal-ai-api-key" placeholder="输入火山引擎API密钥" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 3px;">模型端点ID</label>
                            <input type="text" id="modal-ai-model-endpoint" placeholder="输入模型端点ID（如：ep-xxxx）" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        </div>
                        <button type="button" onclick="generateAiArtTextFromModal()" style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; max-width: 200px;">
                            生成并下载标题图片
                        </button>
                    </div>
                </div>

                <!-- 阵营名称自定义 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px; font-weight: bold;">阵营名称自定义（留空使用默认名称）</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 14px; color: #1e3a5f; font-weight: bold;">镇民</label>
                            <input type="text" id="modal-custom-townsfolk-name" placeholder="镇民" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px;">
                            <input type="color" id="modal-custom-townsfolk-color" value="#1e3a5f" style="width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 14px; color: #0d5c5c; font-weight: bold;">外来者</label>
                            <input type="text" id="modal-custom-outsider-name" placeholder="外来者" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px;">
                            <input type="color" id="modal-custom-outsider-color" value="#0d5c5c" style="width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 14px; color: #8b4513; font-weight: bold;">爪牙</label>
                            <input type="text" id="modal-custom-minion-name" placeholder="爪牙" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px;">
                            <input type="color" id="modal-custom-minion-color" value="#8b4513" style="width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <label style="font-size: 14px; color: #8b0000; font-weight: bold;">恶魔</label>
                            <input type="text" id="modal-custom-demon-name" placeholder="恶魔" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px;">
                            <input type="color" id="modal-custom-demon-color" value="#8b0000" style="width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        </div>
                    </div>
                </div>

                <!-- 自定义阵营 -->
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px; font-weight: bold;">自定义阵营（选填）</h4>
                    <div id="modal-custom-teams-container" style="display: flex; flex-direction: column; gap: 15px;">
                    </div>
                    <button type="button" onclick="addCustomTeamModal()" style="margin-top: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer;">
                        添加阵营
                    </button>
                </div>

                <div style="margin-top: 30px; text-align: right;">
                    <button onclick="saveScriptConfig()" style="background: linear-gradient(135deg, #38a169 0%, #48bb78 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; margin-right: 10px;">保存设置</button>
                    <button onclick="document.body.removeChild(document.getElementById('script-config-modal'))" style="background: linear-gradient(135deg, #e53e3e 0%, #fc8181 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer;">关闭</button>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // 加载当前设置到弹窗
            loadScriptConfigToModal();
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        }

function loadScriptConfigToModal() {
            // 布局方案
            const scriptLayout = document.getElementById('script-layout');
            const layoutRadios = document.querySelectorAll('input[name="scriptLayout"]');
            layoutRadios.forEach(radio => {
                if (scriptLayout && scriptLayout.value === radio.value) {
                    radio.checked = true;
                } else if (!scriptLayout && radio.value === 'scheme1') {
                    radio.checked = true;
                }
            });
            
            // 显示选项
            const showNightOrder = document.getElementById('showNightOrder');
            const showConfigTable = document.getElementById('showConfigTable');
            const showCustomRules = document.getElementById('showCustomRules');
            const showTravellersFabled = document.getElementById('showTravellersFabled');
            const showJinxRules = document.getElementById('showJinxRules');
            const horizontalLayout = document.getElementById('horizontalLayout');
            const reverseOtherNight = document.getElementById('reverseOtherNight');
            
            if (showNightOrder) document.getElementById('modal-showNightOrder').checked = showNightOrder.checked;
            if (showConfigTable) document.getElementById('modal-showConfigTable').checked = showConfigTable.checked;
            if (showCustomRules) document.getElementById('modal-showCustomRules').checked = showCustomRules.checked;
            if (showTravellersFabled) document.getElementById('modal-showTravellersFabled').checked = showTravellersFabled.checked;
            if (showJinxRules) document.getElementById('modal-showJinxRules').checked = showJinxRules.checked;
            if (horizontalLayout) document.getElementById('modal-horizontalLayout').checked = horizontalLayout.checked;
            if (reverseOtherNight) document.getElementById('modal-reverseOtherNight').checked = reverseOtherNight.checked;
            
            // 字号设置
            const fontSizeInput = document.getElementById('font-size-setting');
            const fontSizeRadios = document.querySelectorAll('input[name="fontSize"]');
            fontSizeRadios.forEach(radio => {
                if (fontSizeInput && fontSizeInput.value === radio.value) {
                    radio.checked = true;
                } else if (!fontSizeInput && radio.value === 'small') {
                    radio.checked = true;
                }
            });
            
            // 背景颜色设置
            const bgColorInput = document.getElementById('bg-color-setting');
            const modalBgColor = document.getElementById('modal-bg-color');
            const modalBgColorText = document.getElementById('modal-bg-color-text');
            if (bgColorInput && modalBgColor && modalBgColorText) {
                modalBgColor.value = bgColorInput.value;
                modalBgColorText.value = bgColorInput.value;
            }
            
            // 透明度设置
            const bgOpacityInput = document.getElementById('bg-opacity-setting');
            const modalBgOpacity = document.getElementById('modal-bg-opacity');
            const modalBgOpacityValue = document.getElementById('modal-bg-opacity-value');
            if (modalBgOpacity && modalBgOpacityValue) {
                const opacity = bgOpacityInput ? parseInt(bgOpacityInput.value) : 100;
                modalBgOpacity.value = opacity;
                modalBgOpacityValue.textContent = opacity + '%';
            }
            
            // 颜色选择器和文本框联动
            modalBgColor.addEventListener('input', function() {
                modalBgColorText.value = this.value;
            });
            modalBgColorText.addEventListener('input', function() {
                const colorValue = this.value.trim();
                if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
                    modalBgColor.value = colorValue;
                }
            });
            
            // 透明度滑块联动
            modalBgOpacity.addEventListener('input', function() {
                modalBgOpacityValue.textContent = this.value + '%';
            });
            
            // API设置
            const apiKey = document.getElementById('ai-api-key');
            const modelEndpoint = document.getElementById('ai-model-endpoint');
            
            if (apiKey) document.getElementById('modal-ai-api-key').value = apiKey.value;
            if (modelEndpoint) document.getElementById('modal-ai-model-endpoint').value = modelEndpoint.value;
            
            // 阵营名称和颜色
            const townsfolkName = document.getElementById('custom-townsfolk-name');
            const townsfolkColor = document.getElementById('custom-townsfolk-color');
            const outsiderName = document.getElementById('custom-outsider-name');
            const outsiderColor = document.getElementById('custom-outsider-color');
            const minionName = document.getElementById('custom-minion-name');
            const minionColor = document.getElementById('custom-minion-color');
            const demonName = document.getElementById('custom-demon-name');
            const demonColor = document.getElementById('custom-demon-color');
            
            if (townsfolkName) document.getElementById('modal-custom-townsfolk-name').value = townsfolkName.value;
            if (townsfolkColor) document.getElementById('modal-custom-townsfolk-color').value = townsfolkColor.value;
            if (outsiderName) document.getElementById('modal-custom-outsider-name').value = outsiderName.value;
            if (outsiderColor) document.getElementById('modal-custom-outsider-color').value = outsiderColor.value;
            if (minionName) document.getElementById('modal-custom-minion-name').value = minionName.value;
            if (minionColor) document.getElementById('modal-custom-minion-color').value = minionColor.value;
            if (demonName) document.getElementById('modal-custom-demon-name').value = demonName.value;
            if (demonColor) document.getElementById('modal-custom-demon-color').value = demonColor.value;
            
            // 加载自定义阵营
            const container = document.getElementById('modal-custom-teams-container');
            container.innerHTML = '';
            
            customTeams.forEach((team, index) => {
                const teamGroup = document.createElement('div');
                teamGroup.className = 'custom-team-group';
                teamGroup.dataset.teamIndex = index;
                teamGroup.style.cssText = `padding: 10px; background: rgba(0,0,0,0.03); border-radius: 6px; border: 1px solid #e9ecef;`;
                
                teamGroup.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 14px; color: #6b5a45;">阵营 ${index + 1}</h4>
                        <button type="button" onclick="removeCustomTeam(${index})" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 12px; cursor: pointer;">
                            删除
                        </button>
                    </div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">阵营名称</label>
                            <input type="text" class="custom-team-name" value="${team.name || ''}" placeholder="输入自定义阵营名称" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">阵营颜色</label>
                            <input type="color" class="custom-team-color" value="${team.color || '#6b5a45'}" style="width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">从已选角色中添加</label>
                        <div class="available-roles-container" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 4px; max-height: 120px; overflow-y: auto; margin-bottom: 10px;">
                            ${(() => {
                                const selectedRoles = getSelectedRoles();
                                if (selectedRoles.length === 0) {
                                    return '<span style="color: #999; font-size: 13px;">没有已选角色，请先在主界面选择角色</span>';
                                }
                                return selectedRoles.map(role => {
                                    const isInTeam = team.roles && team.roles.some(r => r.id === role.id);
                                    return `
                                        <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: ${isInTeam ? 'rgba(107, 70, 193, 0.2)' : 'rgba(107, 70, 193, 0.1)'} ; border-radius: 4px; font-size: 12px; color: #6b46c1; cursor: ${isInTeam ? 'default' : 'pointer'} ; ${isInTeam ? 'opacity: 0.6;' : 'hover: background: rgba(107, 70, 193, 0.2);'}" ${!isInTeam ? `onclick="addRoleToCustomTeam(${index}, '${role.id}')"` : ''}>
                                            <img src="${convertToLocalPath(role.image)}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px;">
                                            <span>${role.name}</span>
                                        </span>
                                    `;
                                }).join('');
                            })()}
                        </div>
                        <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">已添加的角色</label>
                        <div class="custom-team-roles-container" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 4px; min-height: 40px;">
                            ${team.roles && team.roles.length > 0 ? team.roles.map(role => `
                                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: rgba(107, 70, 193, 0.1); border-radius: 4px; font-size: 12px; color: #6b46c1;">
                                    <img src="${convertToLocalPath(role.image)}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px;">
                                    <span>${role.name}</span>
                                    <button onclick="removeRoleFromCustomTeam(${index}, '${role.id}')" style="margin-left: 5px; padding: 2px 6px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 10px; cursor: pointer;">×</button>
                                </span>
                            `).join('') : '<span style="color: #999; font-size: 13px;">暂无角色，请从上方选择添加</span>'}
                        </div>
                    </div>
                `;
                
                container.appendChild(teamGroup);
            });
        }

function saveScriptConfig() {
            // 布局方案
            const layoutRadios = document.querySelectorAll('input[name="scriptLayout"]');
            let selectedLayout = 'scheme1';
            layoutRadios.forEach(radio => {
                if (radio.checked) {
                    selectedLayout = radio.value;
                }
            });
            
            // 保存布局方案到隐藏的input元素
            let scriptLayoutInput = document.getElementById('script-layout');
            if (!scriptLayoutInput) {
                scriptLayoutInput = document.createElement('input');
                scriptLayoutInput.type = 'hidden';
                scriptLayoutInput.id = 'script-layout';
                document.body.appendChild(scriptLayoutInput);
            }
            scriptLayoutInput.value = selectedLayout;
            
            // 显示选项
            const showNightOrder = document.getElementById('showNightOrder');
            const showConfigTable = document.getElementById('showConfigTable');
            const showCustomRules = document.getElementById('showCustomRules');
            const showTravellersFabled = document.getElementById('showTravellersFabled');
            const showJinxRules = document.getElementById('showJinxRules');
            const horizontalLayout = document.getElementById('horizontalLayout');
            const reverseOtherNight = document.getElementById('reverseOtherNight');
            
            if (showNightOrder) showNightOrder.checked = document.getElementById('modal-showNightOrder').checked;
            if (showConfigTable) showConfigTable.checked = document.getElementById('modal-showConfigTable').checked;
            if (showCustomRules) showCustomRules.checked = document.getElementById('modal-showCustomRules').checked;
            if (showTravellersFabled) showTravellersFabled.checked = document.getElementById('modal-showTravellersFabled').checked;
            if (showJinxRules) showJinxRules.checked = document.getElementById('modal-showJinxRules').checked;
            if (horizontalLayout) horizontalLayout.checked = document.getElementById('modal-horizontalLayout').checked;
            if (reverseOtherNight) reverseOtherNight.checked = document.getElementById('modal-reverseOtherNight').checked;
            
            // 字号设置
            const fontSizeRadios = document.querySelectorAll('input[name="fontSize"]');
            let selectedFontSize = 'small';
            fontSizeRadios.forEach(radio => {
                if (radio.checked) {
                    selectedFontSize = radio.value;
                }
            });
            
            // 保存字号设置到隐藏的input元素
            let fontSizeInput = document.getElementById('font-size-setting');
            if (!fontSizeInput) {
                fontSizeInput = document.createElement('input');
                fontSizeInput.type = 'hidden';
                fontSizeInput.id = 'font-size-setting';
                document.body.appendChild(fontSizeInput);
            }
            fontSizeInput.value = selectedFontSize;
            
            // 保存背景颜色设置到隐藏的input元素
            let bgColorInput = document.getElementById('bg-color-setting');
            if (!bgColorInput) {
                bgColorInput = document.createElement('input');
                bgColorInput.type = 'hidden';
                bgColorInput.id = 'bg-color-setting';
                document.body.appendChild(bgColorInput);
            }
            const modalBgColorText = document.getElementById('modal-bg-color-text');
            if (modalBgColorText) {
                bgColorInput.value = modalBgColorText.value.trim() || '#f6f6f4';
            }
            
            // 保存透明度设置到隐藏的input元素
            let bgOpacityInput = document.getElementById('bg-opacity-setting');
            if (!bgOpacityInput) {
                bgOpacityInput = document.createElement('input');
                bgOpacityInput.type = 'hidden';
                bgOpacityInput.id = 'bg-opacity-setting';
                document.body.appendChild(bgOpacityInput);
            }
            const modalBgOpacity = document.getElementById('modal-bg-opacity');
            if (modalBgOpacity) {
                bgOpacityInput.value = modalBgOpacity.value;
            }
            
            // API设置
            const apiKey = document.getElementById('ai-api-key');
            const modelEndpoint = document.getElementById('ai-model-endpoint');
            
            if (apiKey) apiKey.value = document.getElementById('modal-ai-api-key').value;
            if (modelEndpoint) modelEndpoint.value = document.getElementById('ai-model-endpoint').value;
            
            // 阵营名称和颜色
            const townsfolkName = document.getElementById('custom-townsfolk-name');
            const townsfolkColor = document.getElementById('custom-townsfolk-color');
            const outsiderName = document.getElementById('custom-outsider-name');
            const outsiderColor = document.getElementById('custom-outsider-color');
            const minionName = document.getElementById('custom-minion-name');
            const minionColor = document.getElementById('custom-minion-color');
            const demonName = document.getElementById('custom-demon-name');
            const demonColor = document.getElementById('custom-demon-color');
            
            if (townsfolkName) townsfolkName.value = document.getElementById('modal-custom-townsfolk-name').value;
            if (townsfolkColor) townsfolkColor.value = document.getElementById('modal-custom-townsfolk-color').value;
            if (outsiderName) outsiderName.value = document.getElementById('modal-custom-outsider-name').value;
            if (outsiderColor) outsiderColor.value = document.getElementById('modal-custom-outsider-color').value;
            if (minionName) minionName.value = document.getElementById('modal-custom-minion-name').value;
            if (minionColor) minionColor.value = document.getElementById('modal-custom-minion-color').value;
            if (demonName) demonName.value = document.getElementById('modal-custom-demon-name').value;
            if (demonColor) demonColor.value = document.getElementById('modal-custom-demon-color').value;
            
            // 保存自定义阵营
            const teamGroups = document.querySelectorAll('.custom-team-group');
            customTeams = [];
            
            teamGroups.forEach((group, index) => {
                const nameInput = group.querySelector('.custom-team-name');
                const colorInput = group.querySelector('.custom-team-color');
                
                // 获取已添加的角色
                const roles = [];
                const roleElements = group.querySelectorAll('.custom-team-roles-container span');
                roleElements.forEach(element => {
                    if (!element.querySelector('button')) return; // 跳过提示文本
                    
                    const roleId = element.querySelector('button').onclick.toString().match(/removeRoleFromCustomTeam\(\d+, '(.*?)'\)/)[1];
                    const role = getSelectedRoles().find(r => r.id === roleId);
                    if (role) {
                        roles.push(role);
                    }
                });
                
                customTeams.push({
                    name: nameInput.value.trim(),
                    color: colorInput.value,
                    roles: roles
                });
            });
            
            // 关闭弹窗
            document.body.removeChild(document.getElementById('script-config-modal'));
            alert('设置已保存！');
        }

function generateAiArtTextFromModal() {
            // 先保存API设置
            const apiKey = document.getElementById('ai-api-key');
            const modelEndpoint = document.getElementById('ai-model-endpoint');
            
            if (apiKey) apiKey.value = document.getElementById('modal-ai-api-key').value;
            if (modelEndpoint) modelEndpoint.value = document.getElementById('modal-ai-model-endpoint').value;
            
            // 调用生成函数
            generateAiArtText();
        }

function addCustomTeamModal() {
            addCustomTeam();
            loadScriptConfigToModal();
        }

function addCustomTeam() {
            const container = document.getElementById('modal-custom-teams-container');
            const newIndex = customTeams.length;
            
            // 添加到数据数组
            customTeams.push({
                name: '',
                color: '#6b5a45',
                roles: []
            });
            
            // 创建新的阵营组
            const teamGroup = document.createElement('div');
            teamGroup.className = 'custom-team-group';
            teamGroup.dataset.teamIndex = newIndex;
            teamGroup.style.cssText = `padding: 10px; background: rgba(0,0,0,0.03); border-radius: 6px; border: 1px solid #e9ecef;`;
            
            teamGroup.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 14px; color: #6b5a45;">阵营 ${newIndex + 1}</h4>
                        <button type="button" onclick="removeCustomTeam(${newIndex})" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 12px; cursor: pointer;">
                            删除
                        </button>
                    </div>
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px;">
                            <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">阵营名称</label>
                            <input type="text" class="custom-team-name" placeholder="输入自定义阵营名称" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">阵营颜色</label>
                            <input type="color" class="custom-team-color" value="#6b5a45" style="width: 100%; height: 36px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">从已选角色中添加</label>
                        <div class="available-roles-container" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 4px; max-height: 120px; overflow-y: auto; margin-bottom: 10px;">
                            ${(() => {
                                const selectedRoles = getSelectedRoles();
                                if (selectedRoles.length === 0) {
                                    return '<span style="color: #999; font-size: 13px;">没有已选角色，请先在主界面选择角色</span>';
                                }
                                return selectedRoles.map(role => `
                                    <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: rgba(107, 70, 193, 0.1); border-radius: 4px; font-size: 12px; color: #6b46c1; cursor: pointer; hover: background: rgba(107, 70, 193, 0.2);" onclick="addRoleToCustomTeam(${newIndex}, '${role.id}')">
                                        <img src="${convertToLocalPath(role.image)}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px;">
                                        <span>${role.name}</span>
                                    </span>
                                `).join('');
                            })()}
                        </div>
                        <label style="font-size: 14px; color: #6b5a45; font-weight: bold; display: block; margin-bottom: 5px;">已添加的角色</label>
                        <div class="custom-team-roles-container" style="display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 4px; min-height: 40px;">
                            <span style="color: #999; font-size: 13px;">暂无角色，请从上方选择添加</span>
                        </div>
                    </div>
                `;
            
            container.appendChild(teamGroup);
            
            // 更新所有阵营的角色选择区域
            updateCustomTeamRolesContainers();
        }

function removeCustomTeam(index) {
            if (customTeams.length <= 1) {
                alert('至少需要保留一个自定义阵营');
                return;
            }
            
            // 从数据数组中删除
            customTeams.splice(index, 1);
            
            // 从DOM中删除
            const container = document.getElementById('modal-custom-teams-container');
            const teamGroups = container.querySelectorAll('.custom-team-group');
            if (teamGroups[index]) {
                teamGroups[index].remove();
            }
            
            // 更新剩余阵营的索引和标题
            teamGroups.forEach((group, i) => {
                if (i >= index) {
                    group.dataset.teamIndex = i;
                    const title = group.querySelector('h4');
                    if (title) {
                        title.textContent = `阵营 ${i + 1}`;
                    }
                    const deleteButton = group.querySelector('button');
                    if (deleteButton) {
                        deleteButton.onclick = () => removeCustomTeam(i);
                    }
                }
            });
            
            // 更新所有阵营的角色选择区域
            updateCustomTeamRolesContainers();
        }

function updateCustomTeamRolesContainers() {
            const containers = document.querySelectorAll('.custom-team-roles-container');
            containers.forEach((container, index) => {
                const team = customTeams[index];
                if (team && team.roles && team.roles.length > 0) {
                    container.innerHTML = team.roles.map(role => `
                        <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; background: rgba(107, 70, 193, 0.1); border-radius: 4px; font-size: 12px; color: #6b46c1;">
                            <img src="${convertToLocalPath(role.image)}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 3px;">
                            <span>${role.name}</span>
                            <button onclick="removeRoleFromCustomTeam(${index}, '${role.id}')" style="margin-left: 5px; padding: 2px 6px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 10px; cursor: pointer;">×</button>
                        </span>
                    `).join('');
                } else {
                    container.innerHTML = '<span style="color: #999; font-size: 13px;">请先选择角色，然后在此处添加</span>';
                }
            });
        }

function removeRoleFromCustomTeam(teamIndex, roleId) {
            if (customTeams[teamIndex] && customTeams[teamIndex].roles) {
                customTeams[teamIndex].roles = customTeams[teamIndex].roles.filter(role => role.id !== roleId);
                updateCustomTeamRolesContainers();
            }
        }

function addRoleToCustomTeam(teamIndex, roleId) {
            // 获取已选角色
            const selectedRoles = getSelectedRoles();
            const role = selectedRoles.find(r => r.id === roleId);
            
            if (role && customTeams[teamIndex]) {
                // 检查角色是否已经在阵营中
                if (!customTeams[teamIndex].roles) {
                    customTeams[teamIndex].roles = [];
                }
                
                if (!customTeams[teamIndex].roles.some(r => r.id === roleId)) {
                    customTeams[teamIndex].roles.push(role);
                    // 重新加载模态框以更新UI
                    loadScriptConfigToModal();
                }
            }
        }

function handleBgImageUpload(input) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('modal-custom-bg-image').value = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }

