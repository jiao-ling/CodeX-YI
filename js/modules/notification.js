(function(global) {
/**
 * 通知模块 - 管理应用程序中的通知
 */
global.NotificationModule = (function() {
    // 私有变量
    const container = document.getElementById('notificationContainer');
    let notificationCount = 0;
    const maxNotifications = 5;
    const notifications = new Map();

    // 初始化
    function init() {
        try {
            // 确保容器存在
            if (!container) {
                console.warn('Notification container not found');
                return;
            }

            // 监听网络状态变化
            YizhiApp.events.on('network:offline', () => {
                show('warning', '网络连接', '网络连接已断开，某些功能可能受到影响。');
            });

            YizhiApp.events.on('network:online', () => {
                show('success', '网络连接', '网络连接已恢复。');
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Notification Module Init');
        }
    }

    // 显示通知
    function show(type, title, message, duration = 5000, options = {}) {
        try {
            if (notificationCount >= maxNotifications) {
                // 移除最旧的通知
                const oldestNotification = notifications.values().next().value;
                if (oldestNotification) {
                    removeNotification(oldestNotification.element);
                }
            }

            notificationCount++;

            // 创建通知元素
            const notification = document.createElement('div');
            const notificationId = YizhiApp.utils.generateId();
            notification.className = `notification notification-${type}`;
            notification.setAttribute('role', 'alert');
            notification.setAttribute('data-id', notificationId);

            // 添加通知图标
            const iconPath = getIconPath(type);

            // 设置通知内容
            notification.innerHTML = `
                <svg class="notification-icon icon" viewBox="0 0 24 24" aria-hidden="true">
                    ${iconPath}
                </svg>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(title)}</div>
                    <div class="notification-message">${escapeHtml(message)}</div>
                    ${options.actions ? createActionButtons(options.actions) : ''}
                </div>
                <button class="notification-close" aria-label="关闭通知">
                    <svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                    </svg>
                </button>
            `;

            // 添加到容器
            container.appendChild(notification);

            // 保存通知引用
            notifications.set(notificationId, {
                element: notification,
                timestamp: Date.now()
            });

            // 添加关闭通知的事件监听器
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', () => {
                removeNotification(notification);
            });

            // 处理操作按钮
            if (options.actions) {
                const actionBtns = notification.querySelectorAll('.notification-action');
                actionBtns.forEach((btn, index) => {
                    btn.addEventListener('click', () => {
                        const action = options.actions[index];
                        if (action.handler) {
                            action.handler();
                        }
                        if (action.closeOnClick !== false) {
                            removeNotification(notification);
                        }
                    });
                });
            }

            // 点击通知主体
            if (options.onClick) {
                notification.addEventListener('click', (e) => {
                    if (!e.target.closest('.notification-close') && !e.target.closest('.notification-action')) {
                        options.onClick();
                        if (options.closeOnClick !== false) {
                            removeNotification(notification);
                        }
                    }
                });
            }

            // 设置自动消失
            if (duration > 0) {
                setTimeout(() => {
                    if (container.contains(notification)) {
                        removeNotification(notification);
                    }
                }, duration);
            }

            // 添加入场动画
            requestAnimationFrame(() => {
                notification.classList.add('notification-enter');
            });

        } catch (error) {
            YizhiApp.errors.handle(error, 'Show Notification');
        }
    }

    // 移除通知
    function removeNotification(notification) {
        try {
            const notificationId = notification.getAttribute('data-id');

            notification.classList.add('exiting');
            setTimeout(() => {
                if (container.contains(notification)) {
                    container.removeChild(notification);
                    notificationCount--;

                    if (notificationId) {
                        notifications.delete(notificationId);
                    }
                }
            }, 300); // 与通知退出动画持续时间匹配
        } catch (error) {
            YizhiApp.errors.handle(error, 'Remove Notification');
        }
    }

    // 获取图标路径
    function getIconPath(type) {
        const icons = {
            success: '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path>',
            info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>',
            warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>',
            error: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>'
        };
        return icons[type] || icons.info;
    }

    // 创建操作按钮
    function createActionButtons(actions) {
        return `
            <div class="notification-actions">
                ${actions.map(action => `
                    <button class="notification-action btn btn-sm ${action.className || ''}">${escapeHtml(action.text)}</button>
                `).join('')}
            </div>
        `;
    }

    // HTML转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 清除所有通知
    function clearAll() {
        try {
            const allNotifications = container.querySelectorAll('.notification');
            allNotifications.forEach(notification => {
                removeNotification(notification);
            });
        } catch (error) {
            YizhiApp.errors.handle(error, 'Clear All Notifications');
        }
    }

    return {
        init,
        show,
        clearAll
    };
})();

/**
 * 卦象数据服务 - 管理易经卦象数据
 */
})(window);
