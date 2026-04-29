/**
 * 全局错误处理器
 *
 * 阈值检测: 连续 N 次致命错误在 M 秒窗口内触发紧急恢复
 * - 排除第三方库错误（jQuery, Vue, lodash 等）
 * - 触发后自动开启调试控制台捕获、显示紧急入口按钮
 * - 状态持久化，下次启动自动恢复
 */

import { debugConsole } from './debug-console';

const ERROR_THRESHOLD = 3;       // 连续次数阈值
const ERROR_WINDOW_MS = 5000;    // 时间窗口（毫秒）
const STORAGE_KEY_ERROR_FLAG = 'acu_script_error_detected';

type ErrorCallback = () => void;

interface FatalErrorState {
  errorCount: number;
  lastErrorTime: number;
  fatalErrorDetected: boolean;
}

class ErrorHandlerImpl {
  private state: FatalErrorState = {
    errorCount: 0,
    lastErrorTime: 0,
    fatalErrorDetected: false,
  };

  /** 第三方库识别正则 */
  private thirdPartyPatterns: RegExp[] = [
    /jquery/i,
    /lodash/i,
    /vue/i,
    /react/i,
    /pixi/i,
    /gsap/i,
    /toastr/i,
    /node_modules/i,
    /chunk-/i,
  ];

  /** 骰子系统核心代码识别正则 */
  private corePatterns: RegExp[] = [
    /acu_visualizer/i,
    /AcuDice/i,
    /骰子系统/i,
    /dice-roller/i,
    /effect-engine/i,
    /attribute-manager/i,
    /database-adapter/i,
    /error-handler/i,
    /debug-console/i,
    /LockManager/i,
    /Store/i,
    /DiceSystem/i,
  ];

  private onFatalErrorCallbacks: ErrorCallback[] = [];
  private installed = false;

  // ========================================
  // 安装 & 卸载
  // ========================================

  /**
   * 安装全局错误处理器（注册 window.onerror + unhandledrejection）
   * 可在应用初始化时调用
   */
  install(): void {
    if (this.installed) return;
    this.installed = true;

    // window.onerror
    window.onerror = (message, source, lineno, colno, error): boolean => {
      this.handleError(error || message, source, lineno, colno, error?.stack);
      return false; // 不阻止默认错误处理
    };

    // unhandledrejection
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.handleError(event.reason, null, null, null, event.reason?.stack);
    });

    // 恢复上次的错误状态
    this.checkAndRestore();

    console.info('[ErrorHandler] 全局错误处理器已安装');
  }

  /**
   * 卸载全局错误处理器
   */
  uninstall(): void {
    if (!this.installed) return;
    this.installed = false;
    window.onerror = null;
    window.removeEventListener('unhandledrejection', this.handleError as unknown as EventListener);
    console.info('[ErrorHandler] 全局错误处理器已卸载');
  }

  // ========================================
  // 错误判定
  // ========================================

  /**
   * 判断是否为骰子系统的致命错误（排除第三方库）
   */
  private isFatalError(
    error: unknown,
    source: string | null,
    _lineno: number | null,
    _colno: number | null,
    stack: string | null | undefined,
  ): boolean {
    const errorInfo = stack || (error instanceof Error ? error.stack : '') || '';
    const errorSource = source || '';

    // 检查是否来自第三方库
    for (const pattern of this.thirdPartyPatterns) {
      if (pattern.test(errorInfo) || pattern.test(errorSource)) {
        return false;
      }
    }

    // 检查是否来自骰子系统核心代码
    for (const pattern of this.corePatterns) {
      if (pattern.test(errorInfo) || pattern.test(errorSource)) {
        return true;
      }
    }

    return false;
  }

  // ========================================
  // 错误处理核心
  // ========================================

  /**
   * 处理一个错误事件
   */
  handleError(
    error: unknown,
    source: string | null,
    lineno: number | null,
    colno: number | null,
    stack: string | null | undefined,
  ): void {
    try {
      if (!this.isFatalError(error, source, lineno, colno, stack)) {
        return; // 非致命错误，忽略
      }

      const now = Date.now();

      // 如果距离上次错误超过时间窗口，重置计数
      if (now - this.state.lastErrorTime > ERROR_WINDOW_MS) {
        this.state.errorCount = 0;
      }

      this.state.errorCount++;
      this.state.lastErrorTime = now;

      if (this.state.errorCount >= ERROR_THRESHOLD && !this.state.fatalErrorDetected) {
        this.state.fatalErrorDetected = true;
        this.triggerFatalError();
      }
    } catch (e) {
      // 错误处理本身出错时，避免无限递归
      console.error('[ErrorHandler] 处理错误时失败:', e);
    }
  }

  // ========================================
  // 致命错误触发
  // ========================================

  /**
   * 触发致命错误处理
   */
  private triggerFatalError(): void {
    try {
      // 自动开启调试控制台
      if (!debugConsole.isEnabled()) {
        debugConsole.setEnabled(true);
        debugConsole.info('[ErrorHandler] 检测到连续致命错误，自动启用调试控制台');
      }

      // 持久化错误标志
      try {
        localStorage.setItem(STORAGE_KEY_ERROR_FLAG, 'true');
      } catch {
        // localStorage 不可用，忽略
      }

      // 显示紧急入口按钮
      this.showEmergencyButton();

      // 调用回调
      this.onFatalErrorCallbacks.forEach(cb => {
        try {
          cb();
        } catch {
          // 单个回调失败不影响其他回调
        }
      });
    } catch (e) {
      console.error('[ErrorHandler] 触发致命错误处理时失败:', e);
    }
  }

  /**
   * 注册致命错误回调（例如通知 UI 层显示恢复界面）
   */
  onFatalError(callback: ErrorCallback): void {
    this.onFatalErrorCallbacks.push(callback);
  }

  // ========================================
  // 紧急入口按钮
  // ========================================

  /**
   * 显示紧急调试入口按钮
   */
  private showEmergencyButton(): void {
    try {
      // 检查是否已存在
      let btn = document.getElementById('acu-emergency-debug-btn');
      if (btn) {
        btn.style.display = 'block';
        return;
      }

      btn = document.createElement('button');
      btn.id = 'acu-emergency-debug-btn';
      btn.textContent = '⚠ 调试';
      btn.style.cssText = [
        'position: fixed',
        'bottom: 20px',
        'right: 20px',
        'z-index: 99999',
        'padding: 10px 16px',
        'background: #e74c3c',
        'color: #fff',
        'border: none',
        'border-radius: 6px',
        'font-size: 14px',
        'font-weight: bold',
        'cursor: pointer',
        'box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4)',
        'display: flex',
        'align-items: center',
        'gap: 6px',
        'transition: all 0.2s',
      ].join(';');

      btn.onmouseenter = () => {
        btn!.style.background = '#c0392b';
        btn!.style.transform = 'scale(1.05)';
      };
      btn.onmouseleave = () => {
        btn!.style.background = '#e74c3c';
        btn!.style.transform = 'scale(1)';
      };

      btn.onclick = () => {
        try {
          // 尝试触发调试控制台显示
          const detail = {
            logs: debugConsole.getLogs(undefined, 200),
            message: '检测到脚本错误，请查看下方调试日志',
          };
          // 派发自定义事件，让 UI 层响应
          window.dispatchEvent(new CustomEvent('acu:emergency-debug', { detail }));
        } catch {
          alert('脚本出现错误，请打开浏览器开发者工具（F12）查看控制台');
        }
      };

      document.body.appendChild(btn);
    } catch (e) {
      console.error('[ErrorHandler] 显示紧急入口按钮失败:', e);
    }
  }

  /**
   * 隐藏紧急入口按钮
   */
  hideEmergencyButton(): void {
    const btn = document.getElementById('acu-emergency-debug-btn');
    if (btn) {
      btn.style.display = 'none';
    }
  }

  // ========================================
  // 状态恢复
  // ========================================

  /**
   * 检查并恢复上一次的错误状态
   */
  checkAndRestore(): void {
    try {
      const errorDetected = localStorage.getItem(STORAGE_KEY_ERROR_FLAG) === 'true';
      if (errorDetected) {
        // 自动开启调试控制台
        if (!debugConsole.isEnabled()) {
          debugConsole.setEnabled(true);
        }
        // 显示紧急入口按钮
        this.showEmergencyButton();
      }
    } catch {
      // localStorage 不可用，忽略
    }
  }

  /**
   * 重置错误状态（用户主动清除）
   */
  reset(): void {
    this.state.errorCount = 0;
    this.state.lastErrorTime = 0;
    this.state.fatalErrorDetected = false;
    this.hideEmergencyButton();
    try {
      localStorage.removeItem(STORAGE_KEY_ERROR_FLAG);
    } catch {
      // 忽略
    }
  }

  /**
   * 获取当前错误状态（供 UI 调试面板使用）
   */
  getState(): Readonly<FatalErrorState> {
    return { ...this.state };
  }
}

/** 全局单例 */
export const errorHandler = new ErrorHandlerImpl();
export type { ErrorCallback };
