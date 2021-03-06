/// <reference path="../_references.d.ts" />

import { LocalStorage, LocalStorageArea, PromiseLocalStorageArea } from "./LocalStorage";
import { AsyncResult } from "../AsyncResult";
import { injectScriptText } from "../Utils";

export class WebExtLocalStorage implements LocalStorage {
    storage: LocalStorageArea;
    promiseStorage: PromiseLocalStorageArea;
    browser;
    keys: string[] = [];
    isArray = false;

    constructor() {
        if (typeof (chrome) != "undefined") {
            this.browser = chrome;
        } else {
            this.browser = browser;
        }
        try {
            this.promiseStorage = this.browser.storage.local;
        } catch (e) {
            this.browser = browser;
            this.promiseStorage = this.browser.storage.local;
        }
    }

    onError = function (e) {
        throw e;
    }

    onSave = function () {
        if (DEBUG) {
            console.log("Storage save success");
        }
    }

    public getAsync<t>(id: string, defaultValue: t): AsyncResult<t> {
        return new AsyncResult<t>((p) => {
            var isArr = this.isArray;
            var callback = (result) => {
                var data = (isArr ? result[0] : result)[id];
                if (data == null) {
                    data = defaultValue;
                }
                p.result(data);
            };
            this.promiseStorage ?
                this.promiseStorage.get(id).then(callback, this.onError) :
                this.storage.get(id, callback);
        }, this);
    }

    public getItemsAsync<t>(ids: string[]): AsyncResult<{ [key: string]: t }> {
        return new AsyncResult<{ [key: string]: t }>((p) => {
            var isArr = this.isArray;
            var callback = (result) => {
                let data = isArr ? result[0] : result;
                p.result(data);
            };
            this.promiseStorage ?
                this.promiseStorage.get(ids).then(callback, this.onError) :
                this.storage.get(ids, callback);
        }, this);
    }

    public put(id: string, value: any) {
        if (this.keys.indexOf(id) == -1) {
            this.keys.push(id);
        }
        var toStore = {};
        toStore[id] = value;
        this.promiseStorage ?
            this.promiseStorage.set(toStore).then(this.onSave, this.onError) :
            this.storage.set(toStore);
    }

    public delete(id: string) {
        var i = this.keys.indexOf(id);
        if (i > -1) {
            this.keys.splice(i, 1);
        }
        this.promiseStorage ?
            this.promiseStorage.remove(id).then(this.onSave, this.onError) :
            this.storage.remove(id);
    }

    public listKeys(): string[] {
        return this.keys;
    }

    public init(): AsyncResult<any> {
        return new AsyncResult<any>((p) => {
            var t = this;
            var callback = (result) => {
                if ($.isArray(result)) {
                    t.isArray = true;
                }
                t.keys = t.keys.concat(Object.keys(t.isArray ? result[0] : result));
                p.done();
            };
            try {
                this.promiseStorage.get(null).then(callback, (e) => {
                    throw e;
                });
            } catch (e) {
                this.promiseStorage = null;
                this.storage = this.browser.storage.local;
                this.storage.get(null, callback);
            }
        }, this);
    }

    loadScript(name: string) {
        $.ajax({
            url: this.browser.extension.getURL(name),
            dataType: "text",
            async: false,
            success: (result) => {
                injectScriptText(result);
            },
            error: (jqXHR: JQueryXHR, textStatus: string, errorThrown: string) => {
                console.log(errorThrown);
            }
        });
    }
}

var LocalPersistence = new WebExtLocalStorage();