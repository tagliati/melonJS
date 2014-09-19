/*
 * MelonJS Game Engine
 * Copyright (C) 2011 - 2014 Olivier Biot, Jason Oster, Aaron McLeod
 * http://www.melonjs.org
 *
 */
(function () {

    /**
     * The WebGL renderer object
     * There is no constructor function for me.CanvasRenderer
     * @namespace me.WebGLRenderer
     * @memberOf me
     * @ignore
     */
    me.WebGLRenderer = (function () {
        var api = {},
        canvas = null,
        fontCache = {},
        fontContext = null,
        fragmentShader = null,
        gl = null,
        globalColor = null,
        imageObject = null,
        positionBuffer = null,
        shaderProgram = null,
        textureBuffer = null,
        vertexShader = null,
        white1PixelTexture = null;

        api.init = function (width, height, c) {
            canvas = c;
            imageObject = new Image();
            gl = canvas.getContext("experimental-webgl");

            this.uniformMatrix = new me.Matrix3d();

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.enable(gl.BLEND);
            this.context = gl;
            this.createShader();

            globalColor = new me.Color(255, 255, 255, 1.0);
            var fontCanvas = me.video.createCanvas(width, height, false);
            fontContext = me.CanvasRenderer.getContext2d(fontCanvas);

            white1PixelTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, white1PixelTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

            this.bindTextures();
            this.createBuffers();

            return this;
        };

        api.bindTexture = function (image) {
            if (image.texture === null || typeof image.texture === "undefined") {
                image.texture = stackgl.gltexture2d(gl, image);
            }
        };

        api.blitSurface = function () {
            // empty function for now
        };

        /**
         * Clears the gl context. Accepts a gl context or defaults to stored gl renderer.
         * @name clearSurface
         * @memberOf me.WebGLRenderer
         * @function
         * @param {WebGLContext} gl - the gl context.
         * @param {String} color - css color string.
         */
        api.clearSurface = function (gl, col) {
            this.setColor(col);
            gl.clearColor(globalColor.r / 255.0, globalColor.g / 255.0, globalColor.b / 255.0, 1.0);
        };

        /**
         * @private
         */
        api.createBuffers = function () {
            textureBuffer = stackgl.createBuffer(gl, [], gl.ARRAY_BUFFER, gl.STATIC_DRAW);
            positionBuffer = stackgl.createBuffer(gl, [], gl.ARRAY_BUFFER, gl.STATIC_DRAW);
        };

        /**
         * @private
         */
        api.createShader = function () {
            fragmentShader =
                "precision mediump float;" +
                "varying vec2 vTexCoord0;" +
                "uniform vec4 uColor;" +
                "uniform sampler2D uTexture0;" +

                "void main(void) {" +
                "   gl_FragColor = texture2D(uTexture0, vTexCoord0) * uColor;" +
                "}"
            ;

            vertexShader =
                "attribute vec2 aPosition;" +
                "attribute vec2 aTexture0;" +
                "uniform mat3 uMatrix;" +
                "varying vec2 vTexCoord0;" +

                "void main(void) {" +
                "   gl_Position = vec4((uMatrix * vec3(aPosition, 1)).xy, 0, 1);" +
                "   vTexCoord0 = aTexture0;" +
                "}"
            ;
            var createShader = stackgl.glslify({
                vertex: vertexShader,
                fragment: fragmentShader,
                inline: true
            });

            shaderProgram = createShader(gl);
        };

        /**
         * draws font to an off screen context, and blits to the backbuffer canvas.
         * @name drawFont
         * @memberOf me.WebGLRenderer
         * @function
         * @param {me.Font} fontObject - an instance of me.Font
         * @param {String} text - the string of text to draw
         * @param {Number} x - the x position to draw at
         * @param {Number} y - the y position to draw at
         * @param {String} gid - the unique identifier of the font object. Used to cache the font canvas
         */
        api.drawFont = function (fontObject, text, x, y, gid) {
            var fontDimensions;
            if (!fontCache[gid]) {
                fontObject.draw(fontContext, text, x, y);
                fontDimensions = fontObject.measureText(fontContext, text);
                imageObject.src = fontContext.toDataURL();
                fontCache[gid] = {
                    "font" : fontObject.font,
                    "fontSize" : fontObject.fontSize,
                    "fillStyle" : fontObject.fillStyle,
                    "textAlign" : fontObject.textAlign,
                    "textBaseline" : fontObject.textBaseline,
                    "lineHeight" : fontObject.lineHeight,
                    "text" : fontObject.text,
                    "image" : fontObject.image,
                    "width" : fontDimensions.width,
                    "height" : fontDimensions.height
                };
                fontContext.clearRect(0, 0, canvas.width, canvas.height);
            }
            else {
                var cache = fontCache[gid];
                if (fontObject.font !== cache.font || fontObject.fontSize !== cache.fontSize || fontObject.fillStyle !== cache.fillStyle || fontObject.textAlign !== cache.textAlign || fontObject.textBaseline !== cache.textBaseline || fontObject.lineHeight !== cache.lineHeight || text !== cache.text) {
                    cache.font = fontObject.font;
                    cache.fontSize = fontObject.fontSize;
                    cache.fillStyle = fontObject.fillStyle;
                    cache.textAlign = fontObject.textAlign;
                    cache.textBaseline = fontObject.textBaseline;
                    cache.lineHeight = fontObject.lineHeight;
                    cache.text = text;
                    
                    fontObject.draw(fontContext, text, x, y);
                    fontDimensions = fontObject.measureText(fontContext, text);
                    imageObject.src = fontContext.toDataURL();
                    cache.width = fontDimensions.width;
                    cache.height = fontDimensions.height;
                    cache.image = imageObject;

                    fontContext.clearRect(0, 0, canvas.width, canvas.height);
                }
            }

            this.context.drawImage(fontCache[gid].image, x, y, fontCache[gid].width, fontCache[gid].height);
        };

        /**
         * Draw an image to the gl context
         * @name drawImage
         * @memberOf me.WebGLRenderer
         * @function
         * @param {image} image html image element
         * @param {Number} sx value, from the source image.
         * @param {Number} sy value, from the source image.
         * @param {Number} sw the width of the image to be drawn
         * @param {Number} sh the height of the image to be drawn
         * @param {Number} dx the x position to draw the image at on the screen
         * @param {Number} dy the y position to draw the image at on the screen
         * @param {Number} dw the width value to draw the image at on the screen
         * @param {Number} dh the height value to draw the image at on the screen
         */
        api.drawImage = function (image, sx, sy, sw, sh, dx, dy, dw, dh) {
            if (typeof image.texture === "undefined") {
                this.bindTexture(image);
            }
            sx = sx / image.width;
            sy = 1.0 - (sy / image.height);
            sw = sw / image.width;
            sh = 1.0 - (sy / image.height);

            var x1 = dx;
            var y1 = dy;
            var x2 = x1 + dw;
            var y2 = y1 + dh;
            positionBuffer.update([
                x1, y1,
                x2, y1,
                x1, y2,
                x1, y2,
                x2, y1,
                x2, y2
            ]);

            shaderProgram.bind();
            positionBuffer.bind();
            shaderProgram.attributes.aPosition.pointer();

            textureBuffer.update([
                sx, sy,
                sw, sy,
                sx, sh,
                sx, sh,
                sw, sy,
                sw, sh
            ]);

            textureBuffer.bind();
            shaderProgram.attribute.aTexture0.pointer();

            shaderProgram.uniforms.uMatrix = this.uniformMatrix;
            shaderProgram.uniforms.uTexture0 = image.texture.bind();

            shaderProgram.uniforms.uColor = globalColor.toGL();
            stackgl.drawTriangle(gl);
        };

        api.fillRect = function (x, y, width, height) {
            shaderProgram.bind();
            var x1 = x;
            var y1 = y;
            var x2 = x + width;
            var y2 = y + height;
            positionBuffer.update([
                x1, y1,
                x2, y1,
                x1, y2,
                x1, y2,
                x2, y1,
                x2, y2
            ]);

            positionBuffer.bind();
            shaderProgram.attributes.aPosition.pointer();
            textureBuffer.update([
                0.0, 0.0,
                1.0, 0.0,
                0.0, 1.0,
                0.0, 1.0,
                1.0, 0.0,
                1.0, 1.0
            ]);
            textureBuffer.bind();
            shaderProgram.attribute.aTexture0.pointer();

            shaderProgram.uniforms.uMatrix = this.uniformMatrix;
            gl.bindTexture(gl.TEXTURE_2D, white1PixelTexture);

            shaderProgram.uniforms.uColor = globalColor.toGL();
        };

        /**
         * return a reference to the system canvas
         * @name getCanvas
         * @memberOf me.WebGLRenderer
         * @function
         * @return {Canvas}
         */
        api.getCanvas = function () {
            return canvas;
        };

        /**
         * Returns the WebGLContext instance for the renderer
         * return a reference to the system 2d Context
         * @name getContext
         * @memberOf me.WebGLRenderer
         * @function
         * @return {WebGLContext}
         */
        api.getContext = function () {
            return gl;
        };

        api.getHeight = function () {
            return this.context.height;
        };

        /**
         * return a reference to the screen canvas
         * @name getScreenCanvas
         * @memberOf me.WebGLRenderer
         * @function
         * @return {Canvas}
         */
        api.getScreenCanvas = function () {
            return canvas;
        };

        /**
         * return a reference to the screen canvas corresponding WebGL Context<br>
         * @name getScreenContext
         * @memberOf me.WebGLRenderer
         * @function
         * @return {WebGLContext}
         */
        api.getScreenContext = function () {
            return gl;
        };

        api.getWidth = function () {
            return this.context.width;
        };

        /**
         * return the current global alpha
         * @name globalAlpha
         * @memberOf me.WebGLRenderer
         * @function
         * @return {Number}
         */
        api.globalAlpha = function () {
            return globalColor.alpha;
        };

        /**
         * resets the gl transform to identity
         * @name resetTransform
         * @memberOf me.WebGLRenderer
         * @function
         */
        api.resetTransform = function () {
            this.uniformMatrix.identity();
        };

        /**
         * resizes the canvas & GL Context
         * @name resize
         * @memberOf me.WebGLRenderer
         * @function
         */
        api.resize = function (scaleX, scaleY) {
            canvas = this.context.view;
            var gameWidthZoom = canvas.width * scaleX;
            var gameHeightZoom = canvas.height * scaleY;
            this.context.resize(gameWidthZoom, gameHeightZoom);
            // adjust CSS style for High-DPI devices
            if (me.device.getPixelRatio() > 1) {
                canvas.style.width = (canvas.width / me.device.getPixelRatio()) + "px";
                canvas.style.height = (canvas.height / me.device.getPixelRatio()) + "px";
            }
        };

        api.restore = function () {

        };

        /**
         * rotates the uniform matrix
         * @name rotate
         * @memberOf me.WebGLRenderer
         * @function
         * @param {Number} angle in radians
         */
        api.rotate = function (angle) {
            this.uniformMatrix.rotate(angle);
        };

        api.save = function () {

        };

        /**
         * scales the uniform matrix
         * @name scale
         * @memberOf me.WebGLRenderer
         * @function
         * @param {Number} x
         * @param {Number} y
         */
        api.scale = function (x, y) {
            this.uniformMatrix.scale(x, y);
        };

        /**
         * Enables/disables alpha
         * @private
         */
        api.setAlpha = function () {
            
        };

        api.setImageSmoothing = function () {
            // TODO: perhaps handle GLNEAREST or other options with texture binding
        };

        /**
         * return the current global alpha
         * @name globalAlpha
         * @memberOf me.WebGLRenderer
         * @function
         * @return {Number}
         */
        api.setGlobalAlpha = function (a) {
            globalColor.alpha = a;
        };

        /**
         * Sets the color for further draw calls
         * @name setColor
         * @memberOf me.WebGLRenderer
         * @function
         * @param {String} color - css color string.
         */
        api.setColor = function (col) {
            if (col.match(/^\#/)) {
                globalColor.parseHex(col);
            }
            else if (col.match(/^rgb/)) {
                globalColor.parseRGB(col);
            }
            else {
                globalColor.parseCSS(col);
            }
        };

        /**
         * Sets the uniform matrix to the specified values from a Matrix2d
         * Created to support the original canvas method on the webgl renderer
         * @name transform
         * @memberOf me.WebGLRenderer
         * @function
         * @param {Number} a the m1,1 (m11) value in the matrix
         * @param {Number} b the m1,2 (m12) value in the matrix
         * @param {Number} d the m2,1 (m21) value in the matrix
         * @param {Number} e the m2,2 (m12) value in the matrix
         * @param {Number} c the m1,3
         * @param {Number} f the m2,3
         */
        api.transform = function (a, b, d, e, c, f) {
            this.uniformMatrix.transform(a, b, d, e, c, f);
        };

        /**
         * Translates the uniform matrix by the given coordinates
         * @name translate
         * @memberOf me.WebGLRenderer
         * @function
         * @param {Number} x
         * @param {Number} y
         */
        api.translate = function (x, y) {
            this.uniformMatrix.translate(x, y);
        };



        return api;
    })();

})();