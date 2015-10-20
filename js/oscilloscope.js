/**
 * Развитие http://jsfiddle.net/diafour/rq48kd0q/6/
 * 1. Убраны артефакты в виде полос и пропусков за счёт «гашения луча» при развёртке x.
 * 2. Время теперь - увеличивающийся таймер в time-emitter.js. Использование Date.now(), последующее деление на 13 приводило к
 *  неравномерной последовательности, т.е. терялись тики.
 * 3.
 */

// TODO добавить управление
// Ручки-крутилки! http://www.domitable.com/static/side-projects/jquery-plugins/knobRot/demo.html
// Реагирование на скролл. https://github.com/jquery/jquery-mousewheel

/**
 * Массив со стареющими объектами. Каждое добавление объектов в
 * приводит к увеличению возраста. Когда возраст объекта становится
 * больше определённого значения, то такой объект не возвращается итератором.
 * Удаление старых объектов происходит, когда размер массива со старьём
 * превышает определённую величину.
 *
 * Циклический массив
 * переопределён forEach, чтобы
 */
function ArrayCyclic(length) {
    this.objs = [];
    this.length = length;
    this.current_index = 0;
}
ArrayCyclic.prototype.forEach = function(cb) {
    var me = this;
    var i;
    var index=0;
    if (me.current_index < me.length-1) {
        for (i = me.current_index+1; i < me.length; i++) {
            if (typeof me.objs[i] == 'undefined') {
                return;
            }
            cb(me.objs[i], index++);
        }
    }
    for (i=0; i<=me.current_index; i++) {
        if (typeof me.objs[i] == 'undefined') {
            return;
        }
        cb(me.objs[i], index++);
    }
//    // reversed
//    for (i=me.current_index; i>=0; i--) {
//        if (typeof me.objs[i] == 'undefined') {
//            continue;
//        }
//        cb(me.objs[i], index++);
//    }
//    for (i=me.length-1; i>me.current_index; i--) {
//        if (typeof me.objs[i] == 'undefined') {
//            continue;
//        }
//        cb(me.objs[i], index++);
//    }
};
ArrayCyclic.prototype.reverseSeq = function(cb) {
    var me = this;
    var i, index=0;
    if (me.current_index > 0) {
        for (i=me.current_index-1; i>=0; i--) {
            cb(i);
        }
    }
    for (i=me.length-1; i>=me.current_index; i--) {
        if (typeof me.objs[i] == 'undefined') {
            continue;
        }
        cb(i);
    }
};
ArrayCyclic.prototype.push = function(obj) {
    var me = this;
    if (typeof obj == 'undefined') {
        return;
    }

    // Увеличить индекс.
    me.current_index = (me.current_index + 1) % me.length;

    // Если нет объекта, присвоить. Если есть — скопировать значения x и y.
    if (typeof me.objs[me.current_index] == 'undefined') {
        me.objs[me.current_index] = obj;
    } else {
        me.objs[me.current_index].x = obj.x;
        me.objs[me.current_index].y = obj.y;
        me.objs[me.current_index].begin = obj.begin;
    }
};
ArrayCyclic.prototype.current = function() {
    return this.objs[this.current_index];
};



/**
 * Луч инициализируется параметрами прямоугольника, куда будет происходить отрисовка.
 * @param x
 * @param y
 * @param w
 * @param h
 * @constructor
 */
function Beam2(x,y,w,h) {
    //Entity.call(this, id, x, y);
    //this.radius = radius;
    //this.length = length;
    this.rect = {x:Math.round(x),
        y:Math.round(y),
        w:Math.round(w),
        h:Math.round(h)};

    // Ширина развёртки
    this.sweep_width = this.rect.w;
    // чувствительность (мВ на деление) * максимальное количество делений = максимальный размах сигнала, пока там для тестов
    this.max_amplitude = this.rect.h;
    // Уровень 0 (y-координата горизонтальной оси), по умолчанию посередине «экрана»
    this.zero_level = Math.round(this.max_amplitude/2);

    // Дельта угла для вычислений (из расчёта, что в sweep_width должен уложиться один период синуса)
    this.dA = 2*Math.PI/this.sweep_width;


    this.length = this.sweep_width+2; // Количество отрезков в луче плюс ещё две точки, чтобы было перекрытие.

    this.traces = new ArrayCyclic(this.length);

    // Параметры
    // "Ускорение времени"
    // множитель ускорения времени
    // вместо добавления в луч одной точки, добавляется сразу mul штук.
    this.mul = 64;

    this.y_signal = function(tick) {return 0; };

    //this.x_signal = this.sweep_signal;
    this.x_state = 'sweep';
}
Beam2.prototype.set_x_signal = function(fn) {
    this.x_signal = fn;
    this.x_state = 'ext';
};
Beam2.prototype.set_y_signal = function(fn) {
    this.y_signal = fn;
};
Beam2.prototype.tick = function(gClk) {
    var me = this;

    // Как бы превратить в WebWorker!
    // http://blog.sethladd.com/2011/09/box2d-and-web-workers-for-javascript.html

    // clock
    // В worker таймер увеличивается с прибавкой в 1

    var lClk = me.mul*gClk; // время ускоряется в mul раз, чтобы получить тики от 0 до mul-1 умножаем глобальнй тик на mul
    //var dA = 2*Math.PI/me.sweep_width;

    //CALCULATE=true;
    for (var i=0; i<me.mul; i++){
        var tick = (lClk + i) % me.sweep_width;

        var y = me.ext_signal_norm('y', me.y_signal(tick, gClk));

        // сигнал (y)
        //var y = me.zero_level + me.max_amplitude/2 * Math.sin(2*tick*me.dA);

        // Пила
        //var y = (tick % (me.sweep_width/3) ) + 50;

        // Меандр!
        //var y =  (tick % (me.sweep_width/3) ) > me.sweep_width/6 ? 50 : 0;

        var x_state;
        if (me.x_state == 'sweep') {
            x_state = me.sweep_signal(tick);
        }
        if (me.x_state == 'ext') {
            var x = me.x_signal(tick, gClk);
            x = me.ext_signal_norm('x', x);
            x_state = {begin:false, x:x};
        }

        //var x_state = me.sweep_signal(tick);

        // развёртка (sweep) пила от 0 до sweep_width и опять в 0
        // var x = tick;
        // на x тоже можно подать сигнал, чтобы увидеть фигуры Лиссажу
        // гашение луча отключается
        //var x_state = me.ext_signal( me.sweep_width/2 +  (me.sweep_width/2) * Math.sin(3*tick*me.dA + Math.PI/3*Math.sin(gClk/4*me.dA))  );


        //var d = Math.sqrt(Math.pow(me.last_x-x, 2) + Math.pow(me.last_y-y, 2));

        me.traces.push({
            begin:x_state.begin,
            'x':x_state.x,
            'y':y
        });
    }
};
Beam2.prototype.draw = function(ctx) {
    var me = this;
    ctx.lineWidth=2;
    ctx.strokeStyle = '#6c6';
    ctx.beginPath();
    this.traces.forEach(function(item, index){
        if (item.begin) {
            //ctx.stroke();
            //ctx.beginPath();
            ctx.moveTo(item.x+me.rect.x,item.y+me.rect.y);
        } else {
            ctx.lineTo(item.x+me.rect.x, item.y+me.rect.y);
        }
    });
    ctx.stroke();

};
// сигнал по оси x.
// Это может быть внешний сигнал, либо развёртка с гашением луча при возврате x в 0
Beam2.prototype.sweep_signal = function(t) {
    return {
        x:t,
        begin: t==0
    };
};
Beam2.prototype.ext_signal = function(t) {
    return {
        x:t,
        begin: false
    };
};
/**
 * Внешний сигнал -1..0..1 уместить по x или y
 * @param t
 * @returns {{x: *, begin: boolean}}
 */
Beam2.prototype.ext_signal_norm = function(axis, value) {
    var me = this;
    var result;
    if (axis == 'x') {
        result = me.sweep_width/2 +  (me.sweep_width/2) * value;
    }
    if (axis == 'y') {
        result = me.zero_level + me.max_amplitude/2 * value;
    }
    return result;
};

Beam2.prototype.sin_wave_phase = function(period, phase) {
    var me = this;
    return function(lClk, gClk) {
        return Math.sin(period*lClk*me.dA + phase*Math.sin(gClk/4*me.dA))
    };
    //var x_state = me.ext_signal( me.sweep_width/2 +  (me.sweep_width/2) * Math.sin(3*tick*dA + Math.PI/3*Math.sin(gClk/4*dA))  );
};
Beam2.prototype.sin_wave = function(period) {
    var me = this;
    return function(lClk) {
        return Math.sin(period*lClk*me.dA);
    };
    //var y = me.zero_level + me.max_amplitude/2 * Math.sin(7*tick*me.dA);
};

//Beam.prototype.y_signal = function(t) {
//
//};

//Polyfill for requestAnimationFrame
(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

/**
 * Простая сцена — просто массив объектов.
 * Два метода:
 * render - отрисовать сцену
 * tick - вычислить новое состояние объектов
 */
var scene = (function(){
    var instance = {};

    instance.objs = [];

    instance.add = function(entity){
        var me = this;
        me.objs[me.objs.length] = entity;
    };

    instance.render = function(ctx) {
        var me = this;
        for (var i=0; i< me.objs.length; i++){
            me.objs[i].draw(ctx);
        }
        return true;
    };

    instance.tick = function(t) {
        var me = this;
        for (var i=0; i< me.objs.length; i++){
            me.objs[i].tick(t);
        }
    };

    return instance;
})();

var oscilloscope = (function(){
    var instance = {};
    instance.config = { canvasId: 'demo-2d'};
    instance.canvas = '';
    instance.ctx = '';
    instance.scene = scene;

    //instance.animate_vars = {};

    instance.is_play = true;

    instance.init = function(config) {
        var me = this;
        jQuery.merge(me.config, config||{});

        me.canvas = document.getElementById(me.config.canvasId);
        me.ctx = me.canvas.getContext('2d');

        //me.scene.add(new Beam(1,0,150,1,300));
        //me.scene.add(new Beam2(305));

        var margin=20;

        var dW = (me.canvas.width-margin*3) / 3;
        var dH = (me.canvas.height-margin*3) / 2;

        var beam = new Beam2(margin, margin, dW*2, dH);
        beam.set_y_signal(beam.sin_wave_phase(5, Math.PI/3));
        beam.set_x_signal(beam.sin_wave(3));

        var beam2 = new Beam2(margin, dH + margin*2, dW*2, dH);
        beam2.set_y_signal(beam2.sin_wave_phase(7, Math.PI/4));
        beam2.set_x_signal(beam2.sin_wave(4));

        var beam3 = new Beam2(dW*2+margin*2, margin, dW, dH*2+margin);
        beam3.set_y_signal(beam3.sin_wave(4));
        beam3.set_x_signal(beam3.sin_wave_phase(5, Math.PI/3));

        me.scene.add(beam);
        me.scene.add(beam2);
        me.scene.add(beam3);

        me.play();
    };

    instance.frames = 0;
    instance.fps_last = 0;
    instance.fps_last_call = Date.now();

    instance.drawFrame = function() {
        var me = this;
        var now = Date.now();
        me.clear_scene(me.ctx);
        var proceed = me.scene.render(me.ctx);

        // Отрисовать FPS, подсчитанные за полсекунды
        me.frames++;
        var fps_delta = now - me.fps_last_call;
        if (fps_delta > 500) {
            me.fps_last = Math.ceil((me.frames*1000/(fps_delta)));
            me.fps_last_call = now;
            me.frames=0;
        }

        me.draw_fps(me.ctx, me.fps_last);

        if (me.is_play && proceed) {
            requestAnimationFrame(function(){instance.drawFrame();}, null);
        }
    };

    instance.pause = function() {
        var me = this;
        me.is_play=false;
    };

    instance.play = function() {
        var me = this;
        me.is_play=true;
        requestAnimationFrame(function(){instance.drawFrame();}, null);
    };

    /**
     * Toggle animation and returns text for a button
     * @returns {string}
     */
    instance.toggle = function() {
        var me = this;
        if (me.is_play) {
            me.pause();
            return "Play";
        } else {
            me.play();
            return "Pause";
        }
    };

    /**
     * No need to set fillStyle. Background color is in CSS.
     * @param ctx  2d context
     */
    instance.clear_scene = function(ctx) {
        var me = this;
        //ctx.save();
        //ctx.fillStyle = '#000';
        ctx.clearRect(0, 0, me.canvas.width, me.canvas.height);
        //ctx.restore();
    };

    instance.clear_scene_2 = function(ctx) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.01;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 300, 300);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
    };

    /**
     * Draw FPS info
     * @param ctx
     * @param fps
     */
    instance.draw_fps = function(ctx, fps) {
        var me = this;
        var beam_length = me.scene.objs[0].traces.objs.length;

        ctx.save();
        ctx.font = '12px monospace';
        ctx.fillStyle = '#3f3';
        ctx.fillText(fps + " FPS " + beam_length, 20,20);
        ctx.restore();
    };

    return instance;
})();

jQuery(function($) {
    $("#stop_anim").click(function() {
        var label = oscilloscope.toggle();
        $(this).text(label);
    });
});

document.worker = new Worker('js/time-emitter.js');

document.worker.onmessage = function (oEvent) {
    //console.log("Received: " + oEvent.data);
    if (oscilloscope.is_play){
        scene.tick(oEvent.data['t']);
    }
};



// Старый луч
/*
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
};

// x,y as black dot (just visualise center)
Entity.prototype.draw = function(ctx) {
    //ctx.fillStyle = 'black';
    //ctx.beginPath();
    //ctx.arc(this.x * SCALE, this.y * SCALE, 2, 0, Math.PI * 2, true);
    //ctx.closePath();
    //ctx.fill();
};

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
        this.fillStyle = this.agedFillStyle(this.age);
    }
};
BeamTrace.prototype.update_age = function(age) {
    this.age = age;
    //this.fillStyle = this.agedFillStyle(this.age);
};

BeamTrace.prototype.inc_age = function(inc) {
    this.update_age(this.age+inc);
};

BeamTrace.prototype.draw = function(ctx) {
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.fillStyle;
    //ctx.beginPath();
    //ctx.arc(this.x * SCALE, this.y * SCALE, this.radius * SCALE, 0, Math.PI * 2, true);
    //ctx.closePath();
    //ctx.fill();
    //Entity.prototype.draw.call(this, ctx);
};

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
};


function Beam(id, x, y, radius, max_age) {
    Entity.call(this, id, x, y);
    this.radius = radius;
    this.max_age = max_age;
    this.traces = new ArrayCyclic(max_age);
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
    // Новые объекты добавить в список
    for (var i=0; i<state.length; i++) {
        //this.last_id = this.last_id > this.max_id ? 0 : this.last_id+1;
        var new_trace = new BeamTrace(this.last_id, this.radius, this.max_age, this.alpha_table);
        new_trace.update(state[i]);
        me.traces.push(new_trace);
    }

//     // state - состояние новогоBeamTrace.
//     // Добавить его с конец, пройти с начала и увеличить всем возраст на 1, старше max_age - удалить
//     // Новая точка может быть на большом расстоянии, тогда нужно заполнить точками
//     // между новой и последней. Хотя это должен сделать calculate.
//     // т.е. может придти массив точек. тогда нужно взять самую старшую и её возраст использовать
//     // как дельту обновления существующих точек.
//     var state_age=0;
//     for (var i=0; i<state.length; i++) {
//     if (state[i].age>state_age) {state_age = state[i].age; }
//     }
//
//     var me = this;
//     this.traces = this.traces.filter(function(item){
//     if (item.age+state_age >= me.max_age) {
//     return false; // remove
//     } else {
//     item.inc_age(state_age+1); return true;
//     }
//     });
//
//     for (var i=0; i<state.length; i++) {
//     //this.last_id = this.last_id > this.max_id ? 0 : this.last_id+1;
//     var new_trace = new BeamTrace(this.last_id, this.radius, this.max_age, this.alpha_table);
//     new_trace.update(state[i]);
//     this.traces.push(new_trace);
//     }
};

Beam.prototype.draw = function(ctx) {
    var prev = null;


    //var item0 = this.traces[this.traces.length-1];
    var item0 = this.traces.current();
    if (typeof item0 != 'undefined') {
        item0.draw(ctx);
    }
    ctx.lineWidth=2;

    ctx.beginPath();


    if (typeof item0 != 'undefined') {
        ctx.moveTo(item0.x, item0.y);
    }

//    for (var i = this.traces.length-2; i>this.traces.length-64; i--) {
//        var item = this.traces[i];
//        if (item) {
//            ctx.lineTo(item.x, item.y);
//        }
//    }

    //var prev = this.traces[this.traces.length-2];
    //var tail = this.traces[this.traces.length-1];

    //if (prev) {ctx.moveTo(prev.x, prev.y); }
    //if (tail) { ctx.lineTo(tail.x, tail.y); }



    this.traces.forEach(function(item){
        //if (prev != null) {
        //if (Math.abs(prev.y-item.y) > 1 || Math.abs(prev.x-item.x) > 1 )  {
        //ctx.moveTo(prev.x,prev.y);
        ctx.lineTo(item.x,item.y);
        //ctx.closePath();
        //}
        //}
        //item.draw(ctx);
        //prev = item;
    });
    //ctx.closePath();
    ctx.stroke();
};

*/