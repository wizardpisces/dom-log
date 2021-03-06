/* 
 *  dom console mainly for development mobile and PC debug
 */
import {
    serialize,
    deserialize,
    _VallinaDomLogKey,
    _
} from './utils';
import {
    h
} from './createNode'

import {
    renderJsonTree
} from './components/index'

import logRootWrapper from './mountShadowRoot'

const CONSOLE_RESOURCE_MAP = {
    "error": {
        color: 'red'
    },
    "log": {
        color: "#000"
    }
}

const ORIGINAL_CONSOLE_METHOD_MAP = {}
const METHODS = Object.keys(CONSOLE_RESOURCE_MAP)
METHODS.forEach(method => {
    ORIGINAL_CONSOLE_METHOD_MAP[method] = console[method];
})

export default class VanillaDomConsole {
    constructor(options = {
        max_history_length: 10, //persist cache 10 logs
        customStyle: {},
        logRoot: logRootWrapper
    }) {
        this._historyLogs = new Proxy(this._getHistoryLogs(), {
            get(target, propKey) {
                return target[propKey]
            },
            set(target, key, val) {
                target[key] = val;
                //replace JSON.stringify to serialize to prevent type function regex ... not correctly stored
                localStorage.setItem(_VallinaDomLogKey, serialize(target.slice(-options.max_history_length)))
                return true;
            }
        });

        this.logRoot = options.logRoot;
        this._batchPaintLog(this._historyLogs)
    }

    delegate() {
        return this.undelegate = createProxyMap(this._proxyLog.bind(this));
    }

    _getHistoryLogs() {
        let cache = deserialize(localStorage.getItem(_VallinaDomLogKey))
        return cache || [];
    }

    _batchPaintLog(historyLogRecords) {
        let fragment = document.createDocumentFragment();
        historyLogRecords.forEach((logParam) => {
            fragment.appendChild(
                h('li', {
                    color: CONSOLE_RESOURCE_MAP[logParam.method].color
                }, formatLog(...logParam.logs))
            );
        });
        // debugger
        this.logRoot.appendChild(fragment)
    }

    _paintLog(logParam) {
        this.logRoot.appendChild(
            h('li', {
                color: CONSOLE_RESOURCE_MAP[logParam.method].color
            }, formatLog(...logParam.logs))
        )
    }

    _proxyLog(logParam) {
        this._historyLogs.push(logParam);
        this._paintLog(logParam)
    }
}


function createProxyMap(proxyFn) {
    METHODS.forEach(method => {
        console[method] = (...args) => {
            proxyFn({
                method,
                logs: args.map(arg => _.deepCopyWithCircularReferenceReplaced(arg, true)) //fix circular reference Maximum call stack size exceeded
            })
            ORIGINAL_CONSOLE_METHOD_MAP[method].apply(null, args)
        }
    })
    return function undelegate() {
        METHODS.forEach(method => {
            console[method] = ORIGINAL_CONSOLE_METHOD_MAP[method]
        })
    }
}

export function formatLog(...logs) {
    return logs.map(log => {
            return renderJsonTree(log)
    })
}