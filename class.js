function factory(base,exports) {

    /**
     * 类构造器
     * @param {object} classDefinition 用户提供的类描述 包含构造函数(constructor)、属性、方法、继承(extends)
     * @param {boolean} noInitParent 是否默认调用父类的构造函数 在有【只需要继承父类的prototype而不需要初始化父类】的需求时 设置为true
     * */
    function Class(classDefinition, noInitParent) {
        var parentClass = classDefinition.Extends;
        var constructor = classDefinition.constructor;
        var implementList= classDefinition.Implements||[];
        if(implementList&&!Array.isArray(implementList)){
            implementList=[implementList];
        }
        delete classDefinition.Extends;
        delete classDefinition.Implements;

        //实际的类
        function XClass() {
            //父类实例
            var parent = {};
            //本类实例
            var instance = this;
            //标示本类构造函数里是否显式调用了父类构造函数
            var explicit = false;
            if(parentClass) {
                //父类并非用new初始化 因此手动设置__proto__
                parent.__proto__ = parentClass.prototype;
            }
            if(!(this instanceof XClass)){
                //妈蛋有人连new都懒得写
                instance={};
                instance.__proto__=XClass.prototype;
            }

            //此函数用于本类构造函数里调用父类构造函数 用后即焚
            instance.Super = function $super() {
                if(!explicit) {
                    //只允许执行一次
                    explicit = true;
                    if(parentClass) {
                        //如果父类存在就调用父类的构造函数
                        parentClass.apply(parent, arguments);
                        //初始化父类的mixin
                        parentClass.mixin.init(parent, arguments);
                    }
                }
            };
            //调用本类的构造函数
            var ret = constructor && constructor.apply(instance, arguments);
            XClass.mixin.init(instance, arguments);
            if(!explicit && !noInitParent && parentClass) {
                //如果本类构造函数未显式调用父类构造函数 则默认以无参方式调用父类的构造函数
                //可以指定noInitParent=true 取消默认调用父类的构造函数
                parentClass.call(parent);
                parentClass.mixin.init(parent, arguments);
            }
            //继承父类
            instance.__proto__.__proto__ = parent;
            instance.Super=null;//玩过jass之后就养成set null释放的坏毛病 得治
            //$super设置为父类 之前函数销毁
            Object.defineProperty(instance, 'Super', {
                value      : parent,
                enumerable : false
            });
            if(instance!==this){
                //用于不new 直接调用构造器的
                return instance;
            }
        }
        //混入implements的成员
        implementList.forEach(function(imp){
            for(var method in imp.prototype){
                if(imp.prototype.hasOwnProperty(method)&&method!='constructor'){
                    classDefinition[method]=imp.prototype[method];
                }
            }
        });
        XClass.prototype = classDefinition;
        XClass.parent = parentClass;
        XClass.toString = function() {
            return (constructor || function() {
            }).toString();
        };
        XClass.addAspect = addAspect;
        XClass.mixin = _createMixin(XClass);
        return XClass;

    }

    function _addAnAspect(target, pos, aspect) {// AOP实现
        targetFn = this.prototype[target];
        if(!targetFn || typeof targetFn != 'function') {
            throw new Error('target of addAspect must be a function!["' + target + '"]');
        }

        var targetFn = this.prototype[target];
        if(pos == 'before') {
            this.prototype[target] = function() {
                var advice = {
                    host       : this,
                    methodName : target,
                    pos        : pos
                };
                aspect.apply(advice, arguments);
                return targetFn.apply(this, arguments)
            };
        }
        else if(pos == 'after') {
            this.prototype[target] = function() {
                var advice = {
                    host       : this,
                    methodName : target,
                    pos        : pos
                };
                var ret = targetFn.apply(this, arguments);
                advice.ret = ret;
                var aRet = aspect.apply(advice, arguments);
                if(aRet === undefined) {
                    return ret;
                }
                else {
                    return aRet;
                }

            };
        }
        else if(pos == 'around') {
            this.prototype[target] = function() {
                aspect.apply({
                    host       : this,
                    methodName : target,
                    pos        : 'before'
                }, arguments);
                var ret = targetFn.apply(this, arguments);
                var aRet = aspect.apply({
                    host       : this,
                    methodName : target,
                    pos        : 'after',
                    ret        : ret
                }, arguments);
                if(aRet === undefined) {
                    return ret;
                }
                else {
                    return aRet;
                }

            };
        }
        else {
            return;
        }

        /*this.prototype[target].toString=function(){
         return targetFn.toString();
         }*/
    }

    function addAspect(aspect) {
        for(var key in aspect) {
            if(aspect.hasOwnProperty(key)) {
                var tok = key.split('@');
                if(tok.length == 1) {
                    var pos = 'after';
                    target = tok[0];
                }
                else {
                    pos = tok[0];
                    target = tok[1];
                }

                if(target == '*') {
                    for(var method in this.prototype) {
                        if(this.prototype.hasOwnProperty(method) && typeof this.prototype[method] == 'function') {
                            _addAnAspect.call(this, method, pos, aspect[key]);
                        }
                    }
                }
                else {
                    _addAnAspect.call(this, target, pos, aspect[key]);
                }
            }

        }
        return this;
    }

    //给类创建一个mixin对象（这个对象实际上是个函数 用于添加mixin 并保存了混入的初始化函数）
    function _createMixin(Class) {
        var _mixin = function(mixin) {
            _addMixin.call(_mixin, mixin);
        };
        _mixin.initList = [];
        _mixin.Class = Class;
        _mixin.init = _initMixin;
        return _mixin;
    }

    function _addMixin(mixin) {
        if(mixin.init) {
            this.initList.push(mixin.init);
            delete mixin.init;
        }
        for(var member in mixin) {
            if(mixin.hasOwnProperty(member)) {
                this.Class.prototype[member] = mixin[member];
            }
        }
    };
    function _initMixin(instance, args) {
        this.initList.forEach(function(init) {
            init.apply(instance, args);
        })
    }
    base[exports]=Class;
}
//简单的自适应 不关心什么amd
if(typeof require==='function'){
    factory(module,'exports');
}else {
    factory(window,'Class');
}