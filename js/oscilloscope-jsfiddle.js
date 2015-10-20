// TODO добавить управление
// Ручки! http://www.domitable.com/static/side-projects/jquery-plugins/knobRot/demo.html
// Реагирование на скролл. https://github.com/jquery/jquery-mousewheel

var SCALE=1.0;

// Creating a new document.worker property containing all our "text/js-worker" scripts.
//var blob = new Blob(Array.prototype.map.call(document.querySelectorAll("script[type=\"text\/js-worker\"]"), function (oScript) { return oScript.textContent; }),{type: "text/javascript"});
//document.worker = new Worker(window.URL.createObjectURL(blob));

document.worker = new Worker('js/time-emitter.js');

document.worker.onmessage = function (oEvent) {
    //console.log("Received: " + oEvent.data);
    if (!is_stop_anim){
        calculate_state(scene_objects, oEvent.data);
    }
};




//Polyfill for requestAnimationFrame
(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();


var canvas_2d = document.getElementById('demo-2d');
var ctx_2d = canvas_2d.getContext('2d');

function Entity(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.angle = 0;
}
Entity.prototype.update = function(state) {
    if (state.hasOwnProperty('x')){
        this.x = state.x;
    }
    if (state.hasOwnProperty('y')){
        this.y = state.y;
    }
    if (state.hasOwnProperty('a')){
        this.angle = state.a;
    }
}

// x,y as black dot (just visualise center) 
Entity.prototype.draw = function(ctx) {
    //ctx.fillStyle = 'black';
    //ctx.beginPath();
    //ctx.arc(this.x * SCALE, this.y * SCALE, 2, 0, Math.PI * 2, true);
    //ctx.closePath();
    //ctx.fill();
}

// BeamTrace
// age - возраст точки. Добавив функцию старения и зависимость яркости точки от возраста,
// получится луч с настраиваемым послесвечением
function BeamTrace(id, radius, max_age, alpha_table) {
    Entity.call(this, id, 0, 0);
    this.radius = radius;
    this.max_age = max_age;
    this.age = 0;
    this.alpha_table=alpha_table;
}
BeamTrace.prototype = new Entity();
BeamTrace.prototype.constructor = BeamTrace;

BeamTrace.prototype.update = function(state) {
    Entity.prototype.update.call(this, state);
    if (state.hasOwnProperty('r')){
        this.radius = state.r;
    }
    if (state.hasOwnProperty('age')){
        this.update_age(state.age);
    }
}
BeamTrace.prototype.update_age = function(age) {
    this.age = age;
    this.fillStyle = this.agedFillStyle(this.age);
}

BeamTrace.prototype.inc_age = function(inc) {
    this.update_age(this.age+inc);
}

BeamTrace.prototype.draw = function(ctx) {
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.fillStyle;
    //ctx.beginPath();
    //ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE, 0, Math.PI * 2, true);
    //ctx.closePath();
    //ctx.fill();
    //Entity.prototype.draw.call(this, ctx);
}

// Базовый цвет rgb(40,255,40).
// Чем старее точка, тем она темнее и прозрачнее
BeamTrace.prototype.agedFillStyle = function(age) {
    // hsla(120, 100%, 58%, 1)
    var h = 120;
    var s = 100;
    var alpha = this.alpha_table[age];
    //var alpha = age<this.max_age*0.3?1:age>this.max_age?0:
    //		    //1.3-1.3*Math.pow((age-(this.max_age*0.05))/(this.max_age*0.95), 0.2);
    //			//1-(age)*(1/this.max_age);
    //            age>
    //            0.1;
    //age<5?1:age>99?0:1-(age)*(1/94);
    // 1.3-(1.3*((x-4)/95)^0.3)
    // http://rechneronline.de/function-graphs/
    // a0=2&a1=1&a2=1.3-(1.3*((x-4)/95)^0.3)&a3=&a4=4&a5=4&a6=8&a7=1&a8=1&a9=1&b0=500&b1=500&b2=0&b3=150&b4=-0.2&b5=1.8&b6=10&b7=10&b8=5&b9=5&c0=3&c1=0&c2=1&c3=1&c4=1&c5=1&c6=1&c7=0&c8=0&c9=0&d0=1&d1=20&d2=20&d3=0&d4=0&d5=5&d6=5&d7=100&d8=&d9=&e0=&e1=&e2=&e3=&e4=14&e5=14&e6=13&e7=12&e8=0&e9=1&f0=0&f1=1&f2=1&f3=0&f4=0&f5=&f6=&f7=&f8=&f9=&g0=&g1=1&g2=1&g3=0&g4=0&g5=0&g6=Y&g7=ffffff&g8=a0b0c0&g9=6080a0&h0=1&z
    //var l = age<this.max_age*0.1?58: age>this.max_age?0 :
    //        58-((age-this.max_age*0.1)*58/this.max_age*0.9);
    var l=58;

    return 'hsla('+h+', '+s+'%, '+l+'%, ' + alpha+')';
    //return 'rgba(40,255,40,'+(age<5?1:age>99?0:1-(age)*(1/94))+')';
}


function Beam(id, x, y, radius, max_age) {
    Entity.call(this, id, x, y);
    this.radius = radius;
    this.max_age = max_age;
    this.traces = [];
    this.last_id = 0;
    this.max_id = this.max_age*2;

    this.alpha_table = [];
    for (var i=0; i<=this.max_age; i++) {
        if (i < this.max_age*0.3) {
            this.alpha_table[i]=1;
            //} else if (i < this.max_age*0.7) {
            //  this.alpha_table[i] = 1-(i-this.max_age*0.3)*(1/(this.max_age));
        } else {
            this.alpha_table[i] = 1-(i-this.max_age*0.3)*(1/(this.max_age*1.1));
        }
    }

    this.update([{'x':x, 'y':y, 'a':0,'age':0}]);
}
Beam.prototype = new Entity();
Beam.prototype.constructor = Beam;
Beam.prototype.update = function(state) {
    var me = this;
    // state - состояние новогоBeamTrace.
    // Добавить его с конец, пройти с начала и увеличить всем возраст на 1, старше max_age - удалить
    // Новая точка может быть на большом расстоянии, тогда нужно заполнить точками
    // между новой и последней. Хотя это должен сделать calculate.
    // т.е. может придти массив точек. тогда нужно взять самую старшую и её возраст использовать
    // как дельту обновления существующих точек.
    var state_age=0;
    for (var i=0; i<state.length; i++) {
        if (state[i].age>state_age) {state_age = state[i].age; }
    }

    var me = this;
    this.traces = this.traces.filter(function(item){
        if (item.age+state_age >= me.max_age) {
            return false; // remove
        } else {
            item.inc_age(state_age+1); return true;
        }
    });

    for (var i=0; i<state.length; i++) {
        //this.last_id = this.last_id > this.max_id ? 0 : this.last_id+1;
        var new_trace = new BeamTrace(this.last_id, this.radius, this.max_age, this.alpha_table);
        new_trace.update(state[i]);
        this.traces.push(new_trace);
    }
}

Beam.prototype.draw = function(ctx) {
    var prev = null;
    ctx.lineWidth=2;
    ctx.beginPath();
    this.traces.forEach(function(item){
        if (prev != null) {
            //if (Math.abs(prev.y-item.y) > 1 || Math.abs(prev.x-item.x) > 1 )  {
            ctx.moveTo(prev.x,prev.y);
            ctx.lineTo(item.x,item.y);
            ctx.closePath();
            //}
        }
        item.draw(ctx);
        prev = item;
    });
    ctx.stroke();
}

var scene_objects = [];
scene_objects[0] = new Beam(1,0,150,1,300);

var is_stop_anim=false;
$("#stop_anim").click(function() { is_stop_anim=!is_stop_anim; $(this).text(is_stop_anim?"Play":"Pause"); is_stop_anim?'':requestAnimationFrame(animate); });

var frames=0;
var fps_last_call=Date.now();
var fps_last=0;
function animate(timestamp) {
    var now = Date.now();
    var proceed = render();

    // Отрисовать FPS, подсчитанные за полсекунды
    frames++;
    var fps_delta = now - fps_last_call;
    if (fps_delta > 500) {
        fps_last = Math.ceil((frames*1000/(fps_delta)));
        fps_last_call = now;
        frames=0;
    }

    draw_fps(ctx_2d, fps_last);

    if (!is_stop_anim && proceed) {
        requestAnimationFrame(animate);
    }
}

//requestAnimationFrame(animate);

function render() {
    clear_scene(ctx_2d);
    draw_objects(scene_objects, ctx_2d);
    return true;
}

function clear_scene(ctx) {
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 300, 300);
    ctx.restore();
}

// Как бы превратить в WebWorker!
// http://blog.sethladd.com/2011/09/box2d-and-web-workers-for-javascript.html
var sweep_width=300;

function calculate_state(objs, t) {
    // множитель ускорения времени
    // вместо добавления в луч одной точки, добавляется сразу mul штук.
    var mul=64;
    // clock
    // В worker время увеличивается на 13мс, поэтому делим на 13,
    // чтобы получить последовательность с увеличением +1
    // можно в worker сделать счётчик +1 и возвращать его значение
    var gClk = t/13;
    var lClk = mul*gClk; // время ускоряется в mul раз

    var dA = 2*Math.PI/sweep_width;
    //CALCULATE=true;
    var o = objs[0];
    var state=[];
    for (var i=0; i<mul; i++){
        var tick = (lClk + i) % sweep_width;
        state[i] = {
            // развёртка (sweep)
            //'x': tick, // пила 0..sweep_width↓0
            // на x тоже можно подать сигнал, можно увидеть фигуры Лиссажу
            'x': 150+100*Math.sin(2*tick*dA + Math.PI/3*Math.sin(gClk/4*dA)),
            // сигнал
            //'y':o['y'],
            //'y': 150+50*Math.sin(t/15.9),
            'y': 150+100*Math.sin(3*tick*dA),
            'age':mul-i-1,
            //'a':0
        };
    }
    o.update(state);
    //CALCULATE=false;
}

function draw_objects(objs, ctx) {
    var o = objs[0];
    ctx.save();
    o.draw(ctx);
    ctx.restore();
}

function draw_fps(ctx, fps) {

    var beam_length = Object.getOwnPropertyNames(scene_objects[0].traces).length;

    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = '#3f3';
    ctx.fillText(fps + " FPS " + beam_length, 20,20);
    ctx.restore();
}