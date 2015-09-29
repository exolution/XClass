function factory(base, exports) {

    function noop(){}
    /**
     * 类构造器
     * @param {object} classDefinition 用户提供的类描述 包含构造函数(constructor)、属性、方法、继承(extends)
     * @param {boolean} noInitParent 是否默认调用父类的构造函数 在有【只需要继承父类的prototype而不需要初始化父类】的需求时 设置为true
     * */
    function Class(classDefinition, noInitParent) {
        var parentClass = classDefinition.Extends;
        var constructor = classDefinition.constructor;
        var implementList = classDefinition.Implements || [];
        if(implementList && !Array.isArray(implementList)) {
            implementList = [implementList];
        }
        delete classDefinition.Extends;
        delete classDefinition.Implements;
        //提取出构造函数里Super调用的参数 让没有显示调用Super时参数为空串
        var superArgs=Compiler.parseSuperArgs(constructor);
        //创建一个实例化父类的函数 因为new 的时候没法 apply所以必须用eval了
        //由于是创建类时就编译好所以不会影响效率
        var initParent=Compiler.compileSuperMethod(parentClass,superArgs,noInitParent);
        //实际的类
        function XClass() {
            //本类实例
            var instance = this;
            //创建父类实例
            var parent=initParent?initParent(parentClass):{};
            //创建一个空函数给本类的构造器调用（因为super的实际工作上一步已经完成）
            instance['Super']=superArgs?noop:parent;
            //创建proto链
            instance['__proto__']=_initProto(XClass.prototype,parent);
            //调用本类的构造函数
            var ret = constructor && constructor.apply(instance, arguments);
            XClass.mixin.init(instance, arguments);
            if(ret && typeof ret === 'object'&&ret!==instance) {
                //如果构造器返回了一个新对象
                instance = ret;
                instance['__proto__'] = _initProto(XClass.prototype, parent);
            }
            if(superArgs){
                //Super设置为父类 之前函数销毁
                //superArgs这里的判断意思是 构造器里面没有显式调用Super时 在前面就初始化好Super
                //原因是 经过测试 在改动对象的__proto__后再给这个对象赋值 效率会降低 所以尽量避免后续赋值
                instance['Super'] = parent;
            }

            /* Object.defineProperty(instance, 'Super', {
             value      : parent,
             enumerable : false
             });*/
            if(instance !== this) {
                //用于不new 直接调用构造器的或者构造器里返回另外一个对象的
                return instance;
            }

        }

        //混入implements的成员
        implementList.forEach(function(imp) {
            for(var method in imp.prototype) {
                if(imp.prototype.hasOwnProperty(method) && method != 'constructor') {
                    classDefinition[method] = imp.prototype[method];
                }
            }
        });
        XClass.prototype = classDefinition;
        XClass.parent = parentClass;
        XClass.toString = function() {
            return (constructor || noop).toString();
        };
        XClass.addAspect = addAspect;
        XClass.mixin = _createMixin(XClass);
        return XClass;

    }



    function _initProto(obj, parent) {
        var newObj = {
        };
        for(var key in obj) {
            if(obj.hasOwnProperty(key)) {
                newObj[key] = obj[key];
            }
        }
        newObj['__proto__']=parent;
        return newObj;
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
    var Compiler=function() {
        var exports={};
        var r_clearComment = /(\/\/[^\n]+)|(\/\*(\s|.)*?\*\/)/g;
        var r_superFinder = /this\s*?\.\s*?Super\(/g;
        function _initSuperProto(parentClass){
            var curClass=parentClass,proto={},curProto=proto;
            while(curClass){
                for(var key in curClass.prototype) {
                    if(curClass.prototype.hasOwnProperty(key)&&key!=='constructor') {
                        curProto[key] = curClass.prototype[key];
                    }
                }
                curProto=curProto.__proto__;
                curClass=curClass.parent;
            }
            return proto;
        }
        exports.parseSuperArgs = function(constructor) {
            var codeStr = constructor.toString();
            var pure = codeStr.replace(r_clearComment, '');
            r_superFinder.exec('');
            var match = r_superFinder.exec(pure);
            var index = r_superFinder.lastIndex;
            var bracket = 0, isInString = null, args = '';
            if(match) {
                while(index < pure.length) {
                    var ch = pure.charAt(index);
                    if(ch === '(' && !isInString) {
                        bracket++;
                    }
                    else if(ch === ')' && !isInString) {
                        if(bracket == 0) {
                            break;
                        }
                        else {
                            bracket--;
                        }
                    }
                    else if(ch === '"') {
                        if(isInString == null) {
                            isInString = '"';
                        }
                        else if(isInString === '"') {
                            isInString = null;
                        }

                    }
                    else if(ch === '\'') {
                        if(isInString == null) {
                            isInString = '\'';
                        }
                        else if(isInString === '\'') {
                            isInString = null;
                        }

                    }
                    else if(!isInString && (ch === ' ' || ch === '\n')) {
                        index++;
                        continue;
                    }
                    args += ch;
                    index++;
                }

            }
            return args;
        };
        exports.compileSuperMethod = function(parentClass, args,noInitParent) {
            if(parentClass) {

                if(noInitParent&&!args){
                    return _initSuperProto;
                }
                else{
                    return eval('(function $super(){' +
                                'return new parentClass(' + args + ');' +
                                '})');
                }
            }
            else return null;
        };
        return exports;
    }();
    base[exports] = Class;
}
//简单的自适应 不关心什么amd
if(typeof require === 'function') {
    factory(module, 'exports');
} else {
    factory(window, 'Class');
}
