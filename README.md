##XClass 一个小巧精致的Class系统


###特点
* 实现继承机制，使用简单
* 简单的Implements实现多继承
* 较完美的实现super机制
    - 使用Super调用父类构造函数
    - 如果没有显式调用Super 则默认以无参数形式调用父类构造函数
    - 使用Super访问父类的方法（特别是被子类覆盖掉的）
* 简单的AOP机制，允许对类方法进行代理
* 简单的mixin机制，允许对现有类进行植入式扩展
* 核心类代码只有50多行 简洁明了


###说(che)明(dan)
其实在ES6已经支持class的时代再推出Class系统，多少有些多此一举。
但是对于类的情结，在我当年从Java转行js的时候就已经深深埋下，以前有过几次实现，都不是十分完美和顺手。

其实在js基于原型链的继承成体系下，类系统的实现手段都是殊途同归的~
说白了，类系统就是语法糖，关键就看谁家的糖更甜，用起来更顺手。
ES6的class很甜 语法形式也近乎接近Java/C#之流了 然后还是有很多不爽的地方
比如构造函数里 必须手动调用super() 而且一些做一些植入性扩展也不是十分方便
所以又重新实现了一个~~ 

主要特点还是对于super的实现，也就是在子类构造函数里没有显式调用super时会默认调用无参super()
但是不好的一点是 这个默认调用会在子类构造函数执行完毕之后调用
不过无伤大雅，如果有次序性的要求的话 您还是手动调用super吧

其次另外加入几个糖 

一个是多继承 implements 这个就比较简单了 纯属prototype拷贝
一个是mixin 基本上是prototype拷贝，不同的地方是会在构造函数里植入逻辑。
这颗糖是我写MVC框架的一个需求，就是框架里的一些核心的类暴露给用户，让用户用mixin的方式植入逻辑，进行扩展。
另外一个是AOP，这个其实就是对类方法进行动态代理（当然 ES6的proxy更牛逼 但是不敢用 proxy是没办法to ES5的）


###用法
######1、创建类
Class(classDefinition,noInitParent=false);
`@classDefinition` 传入的类定义
 `@noInitParent` 可选 是否默认调用父类的构造函数 在有【只需要继承父类的prototype而不需要初始化父类】的需求时 设置为true 默认false

```javascript
//创建一个类
var A = Class({
    //构造函数
    constructor : function(a) {
        console.log('class A construct with params:', [].join.call(arguments, ','));
        this.prop_A = a;
        this.prop = 'A';
    },
    //成员函数
    funcA       : function() {
        console.log('call funcA:', this.prop_A);
    },
    func        : function() {
        console.log('call func at[class A] with the private prop:', this.prop)
    }
});
var a=new A();//实例化类
a.func();//对实例操作

```
######2、继承
在类定义里指定`Extends`字段 指定其父类
也可以指定`Implements` 实现多“继承” Implements的值可以是一个类也可以是一个类的数组
注意Implements只是简单的把指定的类的prototype拷贝到该类的的prototype 不存在继承性 无法用super访问到

```javascript
//继承
var B = Class({
    //继承A
    Extends     : A,
    Implements  : [Impl1,Impl2],
    constructor : function(b) {
        //调用父类的构造函数
        this.Super(2);
        console.log('class B construct with params:', [].join.call(arguments, ','));
        this.prop_B = b;
        this.prop = 'B';
    },
    funcB       : function() {
        console.log('call funcB:', this.prop_B);
        console.log('prop_A:', this.prop_A);
    },
    funcX       : function() {
        this.Super.funcA();
    },
    func        : function() {
        console.log('call func at[class B] with the private prop:', this.prop)
        //调用父类的func方法
        this.Super.func();
    }
});
var b=new B();
b.func();
```
######3、AOP
使用 AClass.addAspect(object)对类方法添加切面
object是以键值对的方式提供
value是一个函数
key的规则如下
切面位置@方法名
[before|after|around]@[methodName|*]
切面位置：

`before`是在目标方法执行前执行
`after`是在目标方法执行后执行 
`around`是在目标方法执行前后各执行一次
`methodName` 目标方法名 如果是*就是给该类的所有方法添加切面

切面函数的参数和目标方法的参数一致
而this是一个特殊对象（advice）
{
   `host`:'类实例 相当于目标方法的this',
   `pos`:'切面位置 就是上述的那几个',
   `ret`:'目标方法的返回值 这个只有after切面以及around切面的第二次执行会得到这个值'
}
after切面函数和around切面函数如果返回一个非undefined的值 则作为目标方法的实际返回值

```javascript
//AOP
B.addAspect({
    'after@funcB':function(){
        console.log('advice:',this);
        return 123;
    }
});
b.funcB();
/*结果
call funcB: haha
prop_A: 2
advice: { host: { prop_B: 'haha', prop: 'B' },
  methodName: 'funcB',
  pos: 'after',
  ret: undefined }
*/
```
######4、Mixin
使用 AClass.mixin(object) 扩展该类
作为参数的object 有一个特殊方法 `init` 
这个方法会在该类实例化的时候调用 （就是把这个init函数植入到该类构造函数后面执行）
其余的方法会被塞到类的prototype里

```javascript
B.mixin({
    init:function(){
        console.log('init mixin',this);
    },
    newFunc:function(){
        this.Super.funcA();
    }
});
```
