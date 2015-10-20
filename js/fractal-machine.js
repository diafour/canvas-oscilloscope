/*
 todo&bugs

 IMPORTANT


 rewrite help captions

 LESS IMPORTANT

 better prediction for slow renders or correction after a really slow draw?

 fix the few weird jumps with resizing problems.

 look into a resize that uses max width the way it uses max height (may be tricky).

 touch friendly?

 */

var fract = (function () {
    var module = {},
        zoomlevel = 4,
        zoom = Math.pow(1.25, zoomlevel),
        c,
        ctx,
        height,
        width;

    module.init = function () {
        c = document.getElementById("main");

        c.addEventListener("mousewheel", fract.zoom, false);
        c.addEventListener("DOMMouseScroll", fract.zoom, false);

        ctx = c.getContext("2d");
        fract.angle = makeSlider({steps: 360 / 5, step: 60 / 5, id: "angle"});
        fract.skewangle = makeSlider({steps: 180 / 5, step: 90 / 5, id: "skewangle"});
        fract.poly = makeThumb({steps: 6, step: 0, id: "poly"});
        fract.segments = makeThumb({steps: 5, step: 0, id: "segments"});
        fract.mirror = makeThumb({steps: 2, step: 0, id: "mirror"});

        fract.angle.unlock();

        fract.arms = makeThumb({steps: 2, step: 0, id: "arms"});
        fract.depth = makeThumb({steps: 5, step: 0, id: "depth"});

        window.requestAnimFrame = (function () {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        })();

        fract.angle.fix = function () {
//this function changes steps to match the number of degrees required to do a full loop.
//this code is ugly, but i can't be bothered fixing it right now, I have to go to a party.
            var segments = (fract.segments.step + 1);
            var loopat360 = (2 / (fract.segments.step + 1));
            var i = 1;
            this.steps = 360 / 5;
            while (Math.abs(loopat360 * i % 1) > 0.1) {
                i++;
            }
            this.steps = 360 / 5 * i;

            var skew = fract.skewangle.step - fract.skewangle.steps / 2;
            fract.skewangle.steps = 180 / 5 * segments;
            if (fract.arms.step) {
                fract.skewangle.steps *= 2;
                if (segments % 2 === 0) {
                    fract.angle.steps *= 2;
                }
            }

            if (this.step > this.steps) {
                this.step = this.steps;
            }
            if (Math.abs(skew) > fract.skewangle.steps / 2) {
                fract.skewangle.step = (fract.skewangle.step + fract.skewangle.steps / 2) % fract.skewangle.steps;
            }
            else {
                fract.skewangle.step = fract.skewangle.steps / 2 + skew;
            }
            fract.angle.update(this.step, 0, 1);
            fract.skewangle.update(fract.skewangle.step, 0, 1);
        }

        fract.skewangle.updateLabel = function () {
            this.label.innerHTML = Math.round((this.step - this.steps / 2) * 5);
        }
        fract.skewangle.updateLabel();

        if (window.location.hash != 0) {
            fract.hash.load();
        }

        fract.fixsize();

        document.onkeydown = function (e) {
//console.log(e.keyCode)
            if (e.keyCode == 27) {
//esc
                fract.controls();
            }
            else if (e.keyCode == 46) {
//delete
                fract.controls();
            }
            else if (e.keyCode == 13) {
//enter
                fract.animate.toggle();
            }
            else if (e.keyCode == 38) {
//up
                fract.drag.nudge.start(0);
            }
            else if (e.keyCode == 40) {
//down
                fract.drag.nudge.start(1);
            }
            else if (e.keyCode == 61) {
//+
                fract.zoomnudge(1);
            }
            else if (e.keyCode == 173) {
//-
                fract.zoomnudge(-1);
            }
        }

        document.onkeyup = function (e) {
            if (e.keyCode == 38) {
//up
                fract.drag.nudge.stop(0);
            }
            else if (e.keyCode == 40) {
//down
                fract.drag.nudge.stop(1);
            }
        }

        document.onkeypress = function (e) {
//console.log(e.charCode)
            if (e.charCode == 104) {
//h
                fract.controls();
            }
            else if (e.charCode == 96) {
//h
                fract.controls();
            }
            else if (e.charCode == 113) {
//q
                fract.poly.up(1);
            }
            else if (e.charCode == 119) {
//w
                fract.segments.up(1);
            }
            else if (e.charCode == 101) {
//e
                fract.mirror.up(1);
            }
            else if (e.charCode == 114) {
//r
                fract.arms.up(1);
            }
            else if (e.charCode == 116) {
//t
                fract.depth.up(1);
            }
            else if (e.charCode == 32) {
//space
                fract.animate.toggle();
            }
            else if (e.charCode == 97) {
//a
                fract.poly.down();
            }
            else if (e.charCode == 115) {
//s
                fract.segments.down();
            }
            else if (e.charCode == 100) {
//d
                fract.mirror.down();
            }
            else if (e.charCode == 102) {
//f
                fract.arms.down();
            }
            else if (e.charCode == 103) {
//g
                fract.depth.down();
            }
            else if (e.charCode == 122) {
//z
                fract.reset();
            }
            else if (e.charCode == 120) {
//x
                fract.random();
            }
            else if (e.charCode == 99) {
//c
                fract.animate.toggle();
            }
            else if (e.charCode == 118) {
//v
                fract.color.toggle();
            }
            else if (e.charCode == 98) {
//b
                fract.trails.toggle();
            }
            else if (e.charCode == 49) {
//1
                fract.angle.locktoggle();
            }
            else if (e.charCode == 50) {
//2
                fract.skewangle.locktoggle();
            }
        };
    };

    var clear = function () {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillRect(0, 0, width, height);
        fract.hash.save();
    }

    module.fixsize = function () {
        width = window.innerWidth;
        height = window.innerHeight;
        c.width = width;
        c.height = height;
        ctx.fillStyle = fract.color.bg;
        ctx.strokeStyle = fract.color.fractal;
        ctx.lineWidth = 0.5;
        fract.angle.resize();
        fract.skewangle.resize();
        clear();
        fract.al.render();
    }

    module.reset = function () {
        fract.angle.update(12);
        fract.depth.update(0);
        fract.segments.update(0);
        fract.arms.update(0);
        fract.skewangle.update(90 / 5);
        fract.mirror.update(0);
        fract.poly.update(0);
        if (fract.animate.on) {
            fract.animate.toggle();
        }
        clear();
        fract.al.render();
    }

    module.random = function () {
        fract.angle.random();
        fract.skewangle.random();
        fract.depth.update(Math.floor(Math.random() * 2));
        fract.segments.random();
        fract.mirror.random();
        fract.poly.random();
        fract.arms.random();
        clear();
        fract.al.render();
    }

    module.color = (function () {
        var module = {},
            button;
        module.black = "#000000";
        module.white = "#ffffff";
        module.bg = module.white;
        module.fractal = module.black;
        module.on = false;

        var homelink;

        var colorstep = 0;

        module.jump = function () {
            colorstep++
            var frequency = .01;

            var r = Math.sin(frequency * colorstep + 0) * 127 + 128;
            var g = Math.sin(frequency * colorstep + 2) * 127 + 128;
            var b = Math.sin(frequency * colorstep + 4) * 127 + 128;

            function byte2Hex(n) {
                var nybHexString = "0123456789ABCDEF";
                return String(nybHexString.substr((n >> 4) & 0x0F, 1)) + nybHexString.substr(n & 0x0F, 1);
            }

            if (fract.color.bg === fract.color.black) {
                return '#' + byte2Hex(r) + byte2Hex(g) + byte2Hex(b);
            }
            else {
                return '#' + byte2Hex(r / 2) + byte2Hex(g / 2) + byte2Hex(b / 2);
            }
        }

        module.invert = function () {
            homelink = homelink || document.getElementById("homelink");
            if (this.bg === this.black) {
                this.bg = this.white;
                homelink.className = "homelink";
                this.fractal = this.black;
            }
            else {
                this.bg = module.black;
                this.fractal = module.white;
                homelink.className = "homelinkwhite";
            }
            ctx.fillStyle = this.bg;
            ctx.strokeStyle = this.fractal;
        }

        module.toggle = function () {
            button = button || document.getElementById("colorbutton");
            if (this.on) {
                this.on = false;
                module.invert();
                button.className = ("button");
            }
            else {
                this.on = true;
                button.className = ("buttonon");
            }
            clear();
            fract.al.render();
        }
        return module;
    }());

    module.trails = (function () {
        var module = {},
            button;
        module.on = false;
        module.toggle = function () {
            button = button || document.getElementById("trailsbutton");
            if (this.on) {
                this.on = false;
                ctx.globalCompositeOperation = "source-over";
                button.className = ("button");
                fract.al.render();
            }
            else {
                this.on = true;
                button.className = ("buttonon");
            }
        }
        return module;
    }());

    module.animate = (function () {
        var module = {},
            button;
        module.on = false;
        module.disabled = false;
        module.toggle = function () {
            button = button || document.getElementById("animatebutton");
            if (this.on) {
                this.on = false;
                fract.hash.save();
                button.className = ("button");
            }
            else {
                if (!fract.angle.locked || !fract.skewangle.locked) {
                    this.on = true;
                    button.className = ("buttonon");
                    module.loop();
                }
            }
        }

        module.loop = function () {
            if (module.on) {
                window.setTimeout(module.loop, 1000 / 30);
//requestAnimFrame(module.loop);
                fract.angle.nudge(1 / 2);
                fract.skewangle.nudge(1 / 5);
                if (fract.auto.on) {
                    fract.auto.frame();
                }
                fract.al.render();
            }
        };

        module.disable = function () {
            button = button || document.getElementById("animatebutton");
            button.className = ("buttongrey");
            module.disabled = true;
        }
        module.enable = function () {
            button.className = ("button");
            module.disabled = false;
        }

        return module;
    }());

    module.auto = (function () {
        var module = {},
            pre,
            count,
            changes,
            mode,
            oneframes,
            button,
            nextchange,
            extra;
        module.on = false;
        module.toggle = function () {
            button = button || document.getElementById("autobutton");
            if (this.on) {
                this.on = false;
//if (fract.animate.on){
//	fract.animate.toggle();
//}
                fract.hash.save();
                button.className = ("button");
            }
            else {
                this.on = true;
                count = 0;
                symmetrystart();
                if (!fract.animate.on) {
                    fract.animate.toggle();
                }
                button.className = ("buttonon");
            }
        }

        module.frame = function () {
            count++
            if (mode === "smooth") {
                if (fract.angle.step === 0) {
                    changes++
                    fract.segments.random();
                    fract.mirror.random();
                    fract.depth.update(Math.floor(Math.random() * 2));
                    if (changes === 8) {
                        if (Math.floor(Math.random() * 4)) {
                            rapidstart();
                        }
                        else {
                            symmetrystart();
                        }
                    }
                }
            }
            if (mode === "rapid") {
                if (count === lastchange + nextchange) {
                    lastchange = count;
                    fract.random();
                    pre -= 1;
                    nextchange = Math.floor(Math.pow(1.04, pre));
                    if (nextchange === 0) {
                        if (ones) {
                            nextchange = 1;
                            ones--
                        }
                        else {
                            if (Math.floor(Math.random() * 2)) {
                                smoothstart();
                            }
                            else {
                                longstart();
                            }
                        }
                    }
                }
            }
            if (mode === "symmetry") {
                if (count === lastchange + nextchange) {
                    lastchange = count;
                    clear();
                    fract.angle.random();
                    fract.segments.random();
                    fract.mirror.random();
                    fract.poly.random();
                    if (fract.mirror.step) {
                        fract.arms.random();
                    }
                    else {
                        fract.arms.update(0);
                    }
                    fract.depth.update(Math.floor(Math.random() * 2));
                    fract.skewangle.update(fract.skewangle.steps / 2);
                    pre -= 1;
                    nextchange = Math.floor(Math.pow(1.04, pre));
//console.log(nextchange);
                    if (nextchange === 0) {
                        if (ones) {
                            nextchange = 1;
                            ones--;
                        }
                        else {
                            if (Math.floor(Math.random() * 2)) {
                                smoothstart();
                            }
                            else {
                                longstart();
                            }
                        }
                    }
                }
            }
            if (mode === "long") {
                if (count === lastchange + nextchange) {
                    if (Math.floor(Math.random() * 4)) {
                        rapidstart();
                    }
                    else {
                        symmetrystart();
                    }
                }
            }
        }

//smoothmode
        var smoothstart = function () {
            if (Math.floor(Math.random() * 2)) {
                fract.trails.toggle();
            }
            if (Math.floor(Math.random() * 2)) {
                fract.color.toggle();
            }
            if (fract.color.bg === fract.color.white && Math.floor(Math.random() * 5) !== 0) {
                fract.color.invert();
            }
            mode = "smooth";
            changes = 0;
            fract.poly.random();
            fract.angle.unlock();
            fract.skewangle.lock();
            fract.skewangle.update(fract.skewangle.steps / 2);
            fract.arms.update(0);
        }

//rapidmode
        var rapidstart = function () {
            ones = 20;
            if (!fract.trails.on) {
                fract.trails.toggle();
            }
            if (Math.floor(Math.random() * 2)) {
                fract.color.toggle();
            }
            if (fract.color.bg === fract.color.white && Math.floor(Math.random() * 5) !== 0) {
                fract.color.invert();
            }
            mode = "rapid";
            nextchange = 1;
            lastchange = count;
            pre = 128;
            fract.angle.unlock();
            fract.skewangle.unlock();
            fract.random();
        }
        var symmetrystart = function () {
            ones = 20;
            if (!fract.trails.on) {
                fract.trails.toggle();
            }
            if (Math.floor(Math.random() * 2)) {
                fract.color.toggle();
            }
            if (fract.color.bg === fract.color.white && Math.floor(Math.random() * 5) !== 0) {
                fract.color.invert();
            }
            mode = "symmetry";
            nextchange = 1;
            lastchange = count;
            pre = 128;
            fract.angle.unlock();
            fract.skewangle.lock();
            fract.random();
            fract.skewangle.update(fract.skewangle.steps / 2);
        }

//longmode
        var longstart = function () {
            if (Math.floor(Math.random() * 2)) {
                fract.trails.toggle();
            }
            if (Math.floor(Math.random() * 2)) {
                fract.color.toggle();
            }
            if (fract.color.bg === fract.color.white && Math.floor(Math.random() * 5) !== 0) {
                fract.color.invert();
            }
            mode = "long";
            lastchange = count;
            nextchange = 2048;
            fract.angle.unlock();
            fract.skewangle.unlock();
            fract.random();
        }

        return module;
    }());

    module.controls = function () {
        var controlbox = document.getElementById("controls");
        var homelink = document.getElementById("homediv");
        if (controlbox.className === "controls") {
            homelink.className = "hidden";
            controlbox.className = "hidden";
        }
        else {
            controlbox.className = "controls";
            fract.angle.resize();
            fract.skewangle.resize();
            homelink.className = "homediv";
        }
    }

    module.drag = (function () {
        var module = {};
        var mposy;
        module.offset = 0;
        module.held = false;
        var moved = false;

        module.down = function (e) {
            mposy = e.clientY;
            document.onmouseup = function () {
                return function (event) {
                    module.up(event)
                }
            }();
            document.onmouseout = function () {
                return function (event) {
                    module.out(event)
                }
            }();

            document.onmousemove = function () {
                return function (event) {
                    module.move(event)
                }
            }();
            module.held = true;
            module.loop();
            e.stopPropagation();
        }

        module.out = function (e) {
            if (e.relatedTarget == null) {
                stopdrag(e);
            }
        }
        module.up = function () {
            document.onmouseout = [];
            document.onmouseout = [];
            document.onmousemove = [];
            module.held = false;
        }
        module.move = function (e) {
            var diffy = e.clientY - mposy;
            module.offset -= diffy;
//fract.al.render();
            mposy = e.clientY;
            moved = true;
        }

        module.loop = function () {
            if (module.held) {
                if (moved && !fract.animate.on) {
                    fract.al.render();
                    moved = false;
                }
                requestAnimFrame(module.loop);
            }
        };

        module.nudge = (function () {
            var module = {};
            module.down = false;
            module.direction = 0;
            module.loop = function () {
                if (module.down) {
                    if (module.direction) {
                        fract.drag.offset -= 5;
                    }
                    else {
                        fract.drag.offset += 5;
                    }
                    if (!fract.animate.on) {
                        fract.al.render();
                    }
                    requestAnimFrame(module.loop);
                }
            };

            module.start = function (direction) {
                module.direction = direction;
                if (!module.down) {
                    module.down = true;
                    module.loop();
                }
            };

            module.stop = function () {
                module.down = false;
            };

            return module;
        }());

        return module;
    }());

    module.zoom = function (e) {
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || (0 - e.detail))));
        fract.zoomnudge(delta);
    };

    module.zoomnudge = function (delta) {
        zoomlevel -= delta;
        zoom = Math.pow(1.25, zoomlevel);
        if (zoom < 1) {
            zoomlevel = 1;
            zoom = 1;
        }
        fract.al.render();
    }

    module.help = (function () {
        var module = {},
            controlbox,
            current = controlbox;
        module.toggle = function () {
            var controlbox = controlbox || document.getElementById("helpbox");
            if (controlbox.className == "helpbox") {
                controlbox.className = "hidden";
            }
            else {
                controlbox.className = "helpbox";
            }
            module.show("default");
        }
        module.show = function (which) {
            var newhelp = document.getElementById("help" + which);
            current = current || document.getElementById("helpdefault");
            current.className = "hidden";
            newhelp.className = "";
            current = newhelp;
        }
        return module;
    }());

    module.hash = (function () {
        var module = {};
        module.current;
        module.save = function () {
            var ruleid = "#" +
                (('000' + (Math.round(fract.angle.step * 5))).substr(-4)) + "," +
                ('000' + (Math.round(fract.skewangle.step * 5))).substr(-4) + "," +
                (fract.poly.step + 1) + "," +
                (fract.segments.step + 1) + "," +
                fract.mirror.step + "," +
                fract.arms.step + "," +
                (fract.depth.step + 1);
            module.current = ruleid;
            window.location = String(window.location).replace(/\#.*$/, "") + ruleid;
        }

        module.load = function () {
            if (window.location.hash != 0) {
                if (window.location.hash !== module.current) {
                    var ruleid = window.location.hash;
                    if (ruleid.length === 14) {
                        fract.depth.update(ruleid.charAt(6) - 1);
                        fract.poly.update(ruleid.charAt(8) - 1);
                        fract.segments.update((ruleid.charAt(10) + ruleid.charAt(11)) - 4);
                        fract.angle.fix();
                        fract.angle.update((ruleid.charAt(1) + ruleid.charAt(2) + ruleid.charAt(3) + ruleid.charAt(4)) / 5);
                        fract.mirror.update(ruleid.charAt(13) - 0);
                        fract.arms.update(0);
                        fract.skewangle.update(fract.skewangle.steps / 2);
                        fract.al.render();
                    }
                    else {
                        fract.poly.update(ruleid.charAt(11) - 1);
                        fract.segments.update(ruleid.charAt(13) - 1);
                        fract.mirror.update(ruleid.charAt(15) - 0);
                        fract.arms.update(ruleid.charAt(17) - 0);
                        fract.depth.update(ruleid.charAt(19) - 1);
                        fract.angle.fix();
                        fract.angle.update((ruleid.charAt(1) + ruleid.charAt(2) + ruleid.charAt(3) + ruleid.charAt(4)) / 5);
                        fract.skewangle.update((ruleid.charAt(6) + ruleid.charAt(7) + ruleid.charAt(8) + ruleid.charAt(9)) / 5);
                        fract.al.render();
                    }
                }
            }
        }

        window.onhashchange = module.load;

        return module;
    }());

    module.al = (function () {
        var module = {},
            heading,
            unit,
            x,
            y,
            rads,
            depth,
            segments,
            mirror,
            poly,
            arms,
            motifLines,
            segrad,
            lastrad,
            sideLines;

        var prepare = function prepare() {
            depth = fract.depth.step + 1;
            mirror = fract.mirror.step;
            segments = fract.segments.step + 1;
            poly = fract.poly.step + 1;
            arms = fract.arms.step;
            rads = fract.angle.step * 5 * (Math.PI / 180);

            if (fract.color.bg === fract.color.white && fract.trails.on) {
                ctx.globalCompositeOperation = "lighter";
                ctx.globalAlpha = 0.008;
                ctx.fillRect(0, 0, width, height);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = "source-over";
            }
            else if (fract.color.bg === fract.color.black && fract.trails.on) {
                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha = 0.01;
                ctx.fillRect(0, 0, width, height);
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = "lighter";
            }
            else if (!fract.trails.on) {
                ctx.fillRect(0, 0, width, height);
            }
            if (fract.color.on) {
                ctx.strokeStyle = fract.color.jump();
            }
//this code below is a bit of a mess, but it works.
            var skewrad = (fract.angle.step - fract.skewangle.step + fract.skewangle.steps / 2) * 5 * (Math.PI / 180);

            segrad = skewrad * 2 / segments;
            lastrad = skewrad * 2 - rads;

            var motifTestWidth = 2 + Math.cos(rads);
            var motifTestHeight = Math.sin(rads);
            var motifHeading = rads;
            var motifHeight;
            var motifWidth;
            var motifMax;

            for (i = 0; i < segments; i++) {
                motifHeading -= (segrad);
                motifTestWidth += Math.cos(motifHeading);
                motifTestHeight += Math.sin(motifHeading);
            }
//if the correction is zero, it doesn't work. so i need the default zero.
            var skewCorrection = Math.atan2(motifTestHeight, motifTestWidth) || 0;
//now test for the highest/lowest the line gets after skew correction is applied. if it is too much i change the way the shape renders.
            var testline = function () {
                motifTestWidth += Math.cos(motifHeading);
                motifTestHeight += Math.sin(motifHeading);
                motifMax = Math.max(motifMax, Math.abs(motifTestHeight));
            }

            motifHeading = skewCorrection;
            motifTestWidth = Math.cos(motifHeading);
            motifTestHeight = Math.sin(motifHeading);
            motifMax = Math.abs(motifTestHeight);

            motifHeading -= rads;
            testline();

            for (i = 0; i < segments; i++) {
                motifHeading += (segrad);
                testline();
            }
            motifHeading = skewCorrection;
            testline();

            motifWidth = Math.abs(motifTestWidth);

            var gap;
            if (motifWidth > 0.98) {
//the default(I would use 1, but i want some leeway to make up for floating point weirdness).
                unit = width / zoom / Math.abs(Math.pow(motifWidth, depth));
                gap = width / zoom;

            }
            else {
//the fractal turns in on itself, so the start and end points won't be the limits of the shape.
                unit = Math.abs(width / zoom / (motifWidth - Math.cos(skewCorrection) * 2));
                gap = unit * Math.pow(motifWidth, depth);
            }

            var shrinkray;
            if (motifMax * unit > width / zoom / 2) {
//the motif sticks out too much, so the shape should be shrunk.
                var shrinkray = (width / zoom / 2) / (motifMax * unit);
                unit = unit * shrinkray;
                gap = gap * shrinkray;
            }

            var polyRads;
            var polyOffset = 0;
            if (poly > 2) {
//the fractal is a polygon, so it must be offset and resized accordingly
                polyRads = Math.PI / poly;
                polyOffset = (gap / 2) / Math.tan(polyRads);
                if ((polyOffset * 2) > width / zoom) {
                    shrinkray = ((polyOffset * 2) / (width / zoom));
                    unit = unit / shrinkray;
                    gap = gap / shrinkray;
                    polyOffset = polyOffset / shrinkray;
                }
            }

//the fractal turns as it starts, so i have to act like it's just finished a polygon side. The skews have to stack with every iteration.
            heading = (skewCorrection * depth - (Math.PI * 2) / poly);

            x = width / 2 - (gap / 2);
            y = height / 2 - polyOffset - fract.drag.offset;

            motifLines = 3 + segments;
            if (mirror) {
                motifLines += 1 + segments;
            }
            if (arms) {
                motifLines += segments * (mirror + 1);
            }
            sideLines = Math.pow(motifLines, depth);
        }

        var i,
            snaps = [],
            armSnaps = [];

        var starttime;

        module.render = function render() {
            prepare();
            if (!fract.animate.on && (!fract.angle.held && !fract.skewangle.held)) {
                fract.hash.save();
            }
            i = 0;
//little box at the start to help debug
//ctx.fillStyle="#000000";
//ctx.fillRect(x,y,10,10);
//ctx.fillStyle="#ffffff";
            ctx.beginPath();
            ctx.moveTo(x, y);
            module.morelines();
        }

        module.morelines = function morelines() {
            var turnDepth = 0;
            starttime = Date.now();

            var saveSnap = function savesnap() {
                var outward = {x: x, y: y, heading: heading};
                outward.load = function () {
                    x = this.x;
                    y = this.y;
                    heading = this.heading;
                    ctx.moveTo(x, y);
                }
                return outward;
            }

            var turn = function turn() {
                var count = i / Math.pow(motifLines, turnDepth) % motifLines;
                if (i % sideLines === 0) {
                    heading += (Math.PI * 2) / poly;
                }
                else if (count === 0) {
                    turnDepth += 1;
                    turn();
                    turnDepth -= 1;
                }
                else if (count === 1) {
                    if (mirror) {
                        snaps[turnDepth] = saveSnap();
                    }
                    heading += -rads;
                }
                else if (count < 2 + segments * (arms + 1)) {
                    if (arms) {
                        if (count % 2 === 1) {
                            armSnaps[turnDepth].load();
                            heading += segrad;
                        }
                        else {
                            armSnaps[turnDepth] = saveSnap();
                            heading -= (Math.PI - segrad) / 2;
                        }
                    }
                    else {
                        heading += segrad;
                    }

                }
                else if (count === 2 + segments * (arms + 1)) {
//last turn if mirror is off, otherwise do the snap
                    if (mirror) {
                        snaps[turnDepth].load();
                        heading += lastrad;
                    }
                    else {
                        heading += -lastrad;
                    }
                }
                else if (count < motifLines - 1) {
                    if (arms) {
                        if (count % 2 === 0) {
                            armSnaps[turnDepth].load();
                            heading -= segrad;
                        }
                        else {
                            armSnaps[turnDepth] = saveSnap();
                            heading += (Math.PI - segrad) / 2;
                        }
                    }
                    else {
                        heading -= segrad;
                    }
                }
                else if (count === motifLines - 1) {
//this is the last turn, but is only reached when mirror is on
                    heading += rads;
                }
            }

            while (i < sideLines * poly) {
//check if we need a break after a certain number of lines (can be raised);
                if (i % 256 === 0) {
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    if (Date.now() - starttime > 50) {
                        if (fract.auto.on) {
                            fract.random();
                        }
                        else if (fract.animate.on) {
                            fract.animate.toggle();
                        }
                        requestAnimFrame(fract.al.morelines);
                        break;
                    }
                    else {
                        turn();
                        x += unit * Math.cos(heading);
                        y += unit * Math.sin(heading);
                        ctx.lineTo(x, y);
                        i++
                    }
                }
                else {
                    turn();
                    x += unit * Math.cos(heading);
                    y += unit * Math.sin(heading);
                    ctx.lineTo(x, y);
                    i++
                }
            }
            if (i === sideLines * poly) {
                ctx.stroke();
            }
        }
        return module;
    }());

    var makeSlider = function (spec) {
        var outward = {};
        outward.held = false;
        outward.element = document.getElementById(spec.id);
        outward.steps = spec.steps;
        var slidersize = outward.element.clientWidth;

        outward.resize = function () {
            outward.range = outward.element.parentNode.clientWidth - outward.element.clientWidth;
            outward.start = outward.element.parentNode.getBoundingClientRect().left;
        };
        outward.resize();

        outward.label = document.getElementById("l" + spec.id);

        outward.update = function (step, clicked, fixed) {
            if (outward.step != step || fixed) {
                outward.step = step;
                var sliderx = step * (outward.range / outward.steps);
                outward.element.style.left = sliderx + "px";
                outward.updateLabel();
                if (clicked) {
                    if (fract.animate.on) {
                        outward.lock();
                    }
                    fract.al.render();
                }
            }
        };

        outward.random = function () {
            outward.update(Math.floor(Math.random() * outward.steps));
        }

        outward.updateLabel = function () {
            outward.label.innerHTML = Math.round(outward.step * 5);
        }
        outward.down = function (e) {
            e.preventDefault();
            outward.held = true;
            var where = this;
            document.onmouseup = function () {
                return function (event) {
                    where.stop(event)
                }
            }();
            document.onmouseout = function () {
                return function (event) {
                    where.out(event)
                }
            }();

            document.onmousemove = function () {
                return function (event) {
                    where.move(event)
                }
            }();
            outward.element.className = "sliderdown";
            e.stopPropagation();
        };
        outward.stop = function (e) {
            if (outward.held === true) {
                document.onmouseout = [];
                document.onmouseout = [];
                document.onmousemove = [];
                outward.element.className = "slider";
                outward.held = false;
                fract.hash.save();
            }
        };
        outward.out = function (e) {
            if (e.relatedTarget == null) {
                outward.stop(e);
            }
        };
        var getx = function (mpos) {
            var slidermousepos;
            if ((mpos) < outward.start + (outward.element.clientWidth / 2)) {
                slidermousepos = 0;
            }
            else if (mpos > outward.start + outward.range + (outward.element.clientWidth / 2)) {
                slidermousepos = outward.range;
            }
            else {
                slidermousepos = (mpos - outward.start - (outward.element.clientWidth / 2));
            }
            return slidermousepos;
        };
        outward.move = function (e) {
            var step = Math.round(getx(e.clientX) / (outward.range / outward.steps));
            outward.update(step, true);
        };
        outward.jump = function (e) {
            outward.move(e);
            outward.down(e);
        };

        outward.nudge = function (amount) {
//move by a small amount (for animating)
            if (!outward.locked) {
                var next = this.step + amount;
                if (this.step > this.steps - amount) {
                    next = 0;
                }
                this.update(next);
            }
        }

        var lockbutton = document.getElementById(spec.id + "lock");
        outward.locked = true;
        outward.locktoggle = function () {
            if (outward.locked) {
                outward.unlock();
            }
            else {
                outward.lock();
            }
        }
        outward.lock = function () {
            outward.locked = true;
            lockbutton.className = "button";
            if (fract.angle.locked && fract.skewangle.locked) {
                if (fract.animate.on) {
                    fract.animate.toggle();
                }
                if (fract.auto.on) {
                    fract.auto.toggle();
                }
                fract.animate.disable();
            }
        }
        outward.unlock = function () {
            outward.locked = false;
            lockbutton.className = "buttonon";
            if (fract.animate.disabled) {
                fract.animate.enable();
                fract.animate.toggle();
            }
        }
        outward.highlight = function (state) {
            if (state) {
                outward.element.className = "sliderdown";
            }
            else {
                outward.element.className = "slider";
            }
        }

        outward.step = spec.step;
        outward.element.style.left = outward.step * (outward.range / outward.steps) + "px";
        outward.label.innerHTML = outward.step * 5;

        return outward;
    };

    var makeThumb = function (spec) {
        var outward = {},
            area,
            c,
            ctx,
            d,
            icon,
            cCell,
            over = false;

        area = document.getElementById("thumbarea");
        c = document.createElement("canvas");
        c.className = "thumbcanvas";
        c.width = 56;
        c.height = 56;
        c.onclick = function () {
            outward.up(true);
        };
        ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.lineWidth = 2;

        d = document.createElement("div");
        icon = document.createElement("div");

        d.onclick = function () {
            outward.down();
        };
        c.onmouseover = function () {
            outward.hover();
        };
        c.onmouseout = function () {
            over = false;
            outward.render();
            fract.help.show("default");
        };

        d.onmouseover = function () {
            fract.help.show(outward.id);
        };
        d.onmouseout = function () {
            fract.help.show("default");
        };

        cCell = document.createElement("td");

        area.appendChild(cCell);

        cCell.appendChild(c);
        cCell.appendChild(d);
        d.appendChild(icon);

        outward.steps = spec.steps;
        outward.step = spec.step;
        outward.id = spec.id;

        var fixButtons = function () {
            if (outward.step === 0) {
                d.className = "prevGrey";
            }
            else {
                d.className = "prev";
            }
        }
        outward.render = function () {
            if (!over) {
                ctx.fillRect(0, 0, c.width, c.height);
            }
            else {
                ctx.fillStyle = "#aaaaaa";
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.fillStyle = "#ffffff";
            }
            if (renders[this.id]) {
                renders[this.id](outward.step);
            }
        };
        outward.hover = function () {
            over = true;
            ctx.fillStyle = "#aaaaaa";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.fillStyle = "#ffffff";
            if (renders[this.id]) {
                renders[this.id]((outward.step + 1) % outward.steps);
            }
            fract.help.show(outward.id);
        };
        outward.up = function (loop) {
            if (this.step !== this.steps - 1) {
                this.update(this.step + 1);
            }
            else if (loop) {
                this.update(0);
            }
            fract.al.render();
        };
        outward.down = function () {
            if (this.step !== 0) {
                this.update(this.step - 1);
            }
            fract.al.render();
        };
        outward.update = function (step) {
            this.step = step;
            this.render();
            if (this.id === "segments" || this.id === "arms") {
                fract.angle.fix();
            }
            fixButtons();
        }
        outward.random = function () {
            outward.update(Math.floor(Math.random() * outward.steps));
        }
        outward.hide = function (setting) {
            if (setting) {
                cCell.className = "";
            }
            else {
                cCell.className = "hidden";
            }
        }

        var renders = {};
        renders.mirror = function (step) {
            var topmost = c.width / 3 * Math.cos(60 * (Math.PI / 180));
            ctx.beginPath();
            ctx.moveTo(0, c.height / 2);
            ctx.lineTo(c.width / 3, c.height / 2);
            ctx.lineTo(c.width / 2, topmost);
            ctx.lineTo(c.width * 2 / 3, c.height / 2);
            if (step) {
                ctx.moveTo(c.width / 3, c.height / 2);
                ctx.lineTo(c.width / 2, c.height - topmost);
                ctx.lineTo(c.width * 2 / 3, c.height / 2);
            }
            ctx.lineTo(c.width, c.height / 2);
            ctx.stroke();
        }
        renders.poly = function (step) {
            var length = c.width * 2 / 3,
                polyOffset = (length / 2) / Math.tan(180 / (step + 1) * (Math.PI / 180)),
                x,
                y,
                heading = 360 / (step + 1) * -1,
                radians,
                shrinkray;

            if (step === 0) {
                polyOffset = 0;
            }

            if ((polyOffset * 2) > length) {
                shrinkray = (polyOffset * 2 / length);
                length = length / shrinkray;
                polyOffset = polyOffset / shrinkray;
            }
            x = (c.width - length) / 2;
            y = c.height / 2 - polyOffset;

            if (step === 1) {
                ctx.beginPath();
                ctx.moveTo(x, y - 2);
                ctx.lineTo(x + length, y - 2);
                ctx.moveTo(x, y + 2);
                ctx.lineTo(x + length, y + 2);
                ctx.stroke();
            }
            else {
                ctx.beginPath();
                ctx.moveTo(x, y);
                for (i = 0; i < (step + 1); i++) {
                    heading += 360 / (step + 1);
                    radians = heading * (Math.PI / 180);
                    x += length * Math.cos(radians);
                    y += length * Math.sin(radians);
                    ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }
        renders.segments = function (step) {
            function oneline() {
                x += length * Math.cos(heading);
                y += length * Math.sin(heading);
                ctx.lineTo(x, y);
            }

            var length,
                x = 0,
                y = c.height / 2,
                heading,
                rad = 60 * Math.PI / 180;

            var lengthinunits = 2 + Math.cos(rad);
            heading = -rad;
            for (i = 0; i < step + 1; i++) {
                heading += (rad * 2 / (step + 1));
                lengthinunits += Math.cos(heading);
            }

            length = c.width / lengthinunits;
            heading = 0;
            ctx.beginPath();
            ctx.moveTo(x, y);
            oneline();
            heading += -rad;
            oneline();
            for (i = 0; i < step + 1; i++) {
                heading += rad * 2 / (step + 1);
                oneline();
            }
            heading += -rad;
            oneline();
            ctx.stroke();

        }
        renders.arms = function (step) {
            var topmost = c.width / 3 * Math.cos(60 * (Math.PI / 180));
            ctx.beginPath();
            ctx.moveTo(0, c.height / 2);
            ctx.lineTo(c.width / 3, c.height / 2);
            ctx.lineTo(c.width / 2, topmost);
            ctx.lineTo(c.width * 2 / 3, c.height / 2);
            ctx.lineTo(c.width, c.height / 2);
            if (step) {
                ctx.moveTo(c.width / 2, topmost);
                ctx.lineTo(c.width / 2, topmost - c.height / 3);
            }
            ctx.stroke();
        }
        renders.depth = function (step) {
            var heading = 0;

            function recursivedraw(rads, localdepth) {
                heading = heading + rads;
                if (localdepth === 0) {
//this is for when the fractal is at the bottom level and actually has to draw a line.
                    x += length * Math.cos(heading);
                    y += length * Math.sin(heading);
                    ctx.lineTo(x, y);
                }
                else {
                    recursivedraw(0, localdepth - 1);
                    recursivedraw(-rad, localdepth - 1);
                    recursivedraw(rad * 2, localdepth - 1);
                    recursivedraw(-rad, localdepth - 1);
                }
            }

            var x = 0;
            var y = c.height / 2;
            var rad = 60 * Math.PI / 180;
            var length = c.width / (Math.pow(3, step + 1));

            ctx.beginPath();
            ctx.moveTo(x, y);
            recursivedraw(0, step + 1);
            ctx.stroke();
        }

        fixButtons();
        outward.render();
        return outward;
    };

    return module;
}());
