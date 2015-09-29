/**
 * Created by godsong on 15-9-28.
 */
var Class=require('./class');
var Impl1= Class({
    impl1:function(){

    }
});
var Impl2= Class({
    impl2:function(){

    }
});
var A = Class({
    //Extends:Impl1,
    constructor : function(a) {
        //console.log('class A construct with params:', [].join.call(arguments, ','));
        this.prop_A = a;
        this.prop = 'A';
    },
    funcA       : function() {
        console.log('call funcA:', this.prop_A);
    },
    func        : function() {
        console.log('call func at[class A] with the private prop:', this.prop)
    }
});
function f(){

}
var B = Class({
    Extends      : A,
    constructor : function(b) {
        this.Super(2);
       // console.log('class B construct with params:', [].join.call(arguments, ','));
        this.prop_B = b;
        this.prop = 'B';

    },
    funcB       : function() {
    },
    funcX       : function() {
        this.Super.funcA();
    },
    func        : function() {
        console.log('call func at[class B] with the private prop:', this.prop)
        this.Super.func();
    }
},true);
B.addAspect({
    'after@funcB':function(){
        return 123;
    }
});
B.mixin({
    init:function(){
        //console.log('init mixin',this);
    },
    newFunc:function(){
        this.Super.funcA();
    }
});

function AA(a){
    this.__proto__=_initProto(AA.prototype,{});
    this.prop_A = a;
    this.prop = 'A';
}
AA.prototype={

    funcA       : function() {
        console.log('call funcA:', this.prop_A);
    },
    func        : function() {
        console.log('call func at[class A] with the private prop:', this.prop)
    }
};
function _initProto(obj, parent) {
    var newObj = {};
    for(var key in obj) {
        if(obj.hasOwnProperty(key)) {
            newObj[key] = obj[key];
        }
    }
    newObj['__proto__'] = parent;
    return newObj;
}
function BB(b){
    this.Super=new AA(2);
    this.__proto__=_initProto(BB.prototype,this.Super);
    this.prop_B = b;
    this.prop = 'B';
}
BB.prototype={
    funcB       : function() {
        console.log('call funcB:', this.prop_B);
        console.log('prop_A:', this.prop_A);
    },
    funcX       : function() {
        this.Super.funcA();
    },
    func        : function() {
        console.log('call func at[class B] with the private prop:', this.prop)
        this.Super.func();
    }
};
console.time(2);
for(i=0;i<100000;i++){
    new BB();

}
console.timeEnd(2);


console.time(1);
for(var i=0;i<100000;i++){
    var b=new B();

}
console.timeEnd(1);
