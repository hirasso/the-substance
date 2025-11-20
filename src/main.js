import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// Lerp function
function lerp(start, end, t) {
  return start * (1 - t) + end * t;
}

// State / Configuration
const state = {
  sections: 9,
  pages: 8,
  zoom: 75,
  top: { current: 0 },
  paragraphs: [
    {
      offset: 1,
      factor: 1.75,
      header: "District 4",
      image: "/photo-1515036551567-bf1198cccc35.jpeg",
      aspect: 1.51,
      text: "Two thousand pharmacologists and bio-chemists were subsidized. Six years later it was being produced commercially."
    },
    {
      offset: 2,
      factor: 2.0,
      header: "Diamond Road",
      image: "/photo-1519608487953-e999c86e7455.jpeg",
      aspect: 1.5,
      text: "The man who comes back through the Door in the Wall will never be quite the same as the man who went out. He will be wiser but less sure, happier but less self-satisfied, humbler in acknowledging his ignorance yet better equipped to understand the relationship of words to things, of systematic reasoning to the unfathomable mystery which it tries, forever vainly, to comprehend."
    },
    {
      offset: 3,
      factor: 2.25,
      header: "Catalina",
      image: "/ph1.jpg",
      aspect: 1.5037,
      text: "The substance can take you to heaven but it can also take you to hell. Or else to both, together or alternately. Or else (if you're lucky, or if you've made yourself ready) beyond either of them. And then beyond the beyond, back to where you started from — back to here, back to New Rotham sted, back to business as usual. Only now, of course, business as usual is completely different."
    },
    {
      offset: 4,
      factor: 2.0,
      header: "Building 21",
      image: "/ph3.jpg",
      aspect: 0.665,
      text: "We've found that the people whose EEG doesn't show any alpha-wave activity when they're relaxed aren't likely to respond significantly to the substance. That means that, for about fifteen percent of the population, we have to find other approaches to liberation."
    },
    {
      offset: 5,
      factor: 1.75,
      header: "Sector 8",
      image: "/photo-1533577116850-9cc66cad8a9b.jpeg",
      aspect: 1.55,
      text: "By cultivating the state of mind that makes it possible for the dazzling ecstatic insights to become permanent and habitual illuminations. By getting to know oneself to the point where one won't be compelled by one's unconscious to do all the ugly, absurd, self-stultifying things that one so often finds oneself doing."
    },
    {
      offset: 7,
      factor: 1.05,
      header: "The Factory",
      image: "/photo-1548191265-cc70d3d45ba1.jpeg",
      aspect: 1.77,
      text: "Education and enlightenment."
    }
  ],
  stripes: [
    { offset: 0, color: "#000", height: 13 },
    { offset: 6.3, color: "#000", height: 20 }
  ],
  diamonds: [
    { x: 0, offset: 0.15, pos: new THREE.Vector3(), scale: 0.6, factor: 1.8 },
    { x: 2, offset: 1.1, pos: new THREE.Vector3(), scale: 0.8, factor: 2.1 },
    { x: -5, offset: 2, pos: new THREE.Vector3(), scale: 0.8, factor: 2.5 },
    { x: 0, offset: 3.2, pos: new THREE.Vector3(), scale: 0.8, factor: 1.75 },
    { x: 0, offset: 4, pos: new THREE.Vector3(), scale: 0.8, factor: 2.5 },
    { x: 2, offset: 5.5, pos: new THREE.Vector3(), scale: 1.25, factor: 0.85 },
    { x: -5, offset: 7, pos: new THREE.Vector3(), scale: 0.8, factor: 2 },
    { x: 0, offset: 8, pos: new THREE.Vector3(), scale: 1.5, factor: 6 }
  ]
};

// Custom Shader Material for RGB shift effect
class CustomMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: `
        uniform float scale;
        uniform float shift;
        varying vec2 vUv;
        void main() {
          vec3 pos = position;
          pos.y = pos.y + ((sin(uv.x * 3.1415926535897932384626433832795) * shift * 1.5) * 0.125);
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float hasTexture;
        uniform float shift;
        uniform float scale;
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          float angle = 1.55;
          vec2 p = (vUv - vec2(0.5, 0.5)) * (1.0 - scale) + vec2(0.5, 0.5);
          vec2 offset = shift / 4.0 * vec2(cos(angle), sin(angle));
          vec4 cr = texture2D(tDiffuse, p + offset);
          vec4 cga = texture2D(tDiffuse, p);
          vec4 cb = texture2D(tDiffuse, p - offset);
          if (hasTexture == 1.0) gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);
          else gl_FragColor = vec4(color, opacity);
        }
      `,
      uniforms: {
        tDiffuse: { value: null },
        hasTexture: { value: 0 },
        scale: { value: 0 },
        shift: { value: 0 },
        opacity: { value: 1 },
        color: { value: new THREE.Color("white") }
      },
      transparent: true
    });
  }

  set scale(value) { this.uniforms.scale.value = value; }
  get scale() { return this.uniforms.scale.value; }
  set shift(value) { this.uniforms.shift.value = value; }
  get shift() { return this.uniforms.shift.value; }
  set map(value) {
    this.uniforms.hasTexture.value = !!value ? 1 : 0;
    this.uniforms.tDiffuse.value = value;
  }
  get map() { return this.uniforms.tDiffuse.value; }
  get color() { return this.uniforms.color.value; }
  get opacity() { return this.uniforms.opacity.value; }
  set opacity(value) { if (this.uniforms) this.uniforms.opacity.value = value; }
}

// Backface Material for diamond refraction
class BackfaceMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: `
        varying vec3 worldNormal;
        void main() {
          vec4 transformedNormal = vec4(normal, 0.);
          vec4 transformedPosition = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            transformedNormal = instanceMatrix * transformedNormal;
            transformedPosition = instanceMatrix * transformedPosition;
          #endif
          worldNormal = normalize(modelViewMatrix * transformedNormal).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
        }
      `,
      fragmentShader: `
        varying vec3 worldNormal;
        void main() {
          gl_FragColor = vec4(worldNormal, 1.0);
        }
      `,
      side: THREE.BackSide
    });
  }
}

// Refraction Material for diamond effect
class RefractionMaterial extends THREE.ShaderMaterial {
  constructor(options) {
    super({
      vertexShader: `
        varying vec3 worldNormal;
        varying vec3 viewDirection;
        void main() {
          vec4 transformedNormal = vec4(normal, 0.);
          vec4 transformedPosition = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            transformedNormal = instanceMatrix * transformedNormal;
            transformedPosition = instanceMatrix * transformedPosition;
          #endif
          worldNormal = normalize(modelViewMatrix * transformedNormal).xyz;
          viewDirection = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
          gl_Position = projectionMatrix * modelViewMatrix * transformedPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D envMap;
        uniform sampler2D backfaceMap;
        uniform vec2 resolution;
        varying vec3 worldNormal;
        varying vec3 viewDirection;
        float fresnelFunc(vec3 viewDirection, vec3 worldNormal) {
          return pow(1.05 + dot(viewDirection, worldNormal), 100.0);
        }
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;
          vec3 normal = worldNormal * (1.0 - 0.7) - texture2D(backfaceMap, uv).rgb * 0.7;
          vec4 color = texture2D(envMap, uv += refract(viewDirection, normal, 1.0/1.5).xy);
          gl_FragColor = vec4(mix(color.rgb, vec3(0.4), fresnelFunc(viewDirection, normal)), 1.0);
        }
      `,
      uniforms: {
        envMap: { value: options.envMap },
        backfaceMap: { value: options.backfaceMap },
        resolution: { value: options.resolution }
      }
    });
  }
}

// Main App Class
class App {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.scrollArea = document.getElementById('scrollArea');
    this.loading = document.getElementById('loading');

    this.blocks = [];
    this.textMeshes = [];
    this.planeMeshes = [];
    this.domElements = [];
    this.lastTop = 0;

    this.init();
  }

  init() {
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0c0f13);

    // Setup scene
    this.scene = new THREE.Scene();

    // Setup orthographic camera
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = window.innerHeight / state.zoom;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      1000
    );
    this.camera.position.set(0, 0, 500);

    // Clock for animations
    this.clock = new THREE.Clock();

    // Calculate viewport dimensions
    this.updateViewport();

    // Setup scroll sections
    this.setupScrollSections();

    // Load assets and create scene
    this.loadAssets();

    // Events
    this.scrollArea.addEventListener('scroll', this.onScroll.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  updateViewport() {
    const { zoom, sections, pages } = state;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.canvasWidth = this.viewportWidth / zoom;
    this.canvasHeight = this.viewportHeight / zoom;
    this.mobile = window.innerWidth < 700;
    this.margin = this.canvasWidth * (this.mobile ? 0.2 : 0.1);
    this.contentMaxWidth = this.canvasWidth * (this.mobile ? 0.8 : 0.6);
    this.sectionHeight = this.canvasHeight * ((pages - 1) / (sections - 1));
  }

  setupScrollSections() {
    this.scrollArea.innerHTML = '';
    for (let i = 0; i < state.sections; i++) {
      const div = document.createElement('div');
      div.id = '0' + i;
      div.style.height = `${(state.pages / state.sections) * 100}vh`;
      this.scrollArea.appendChild(div);
    }
  }

  async loadAssets() {
    const textureLoader = new THREE.TextureLoader();
    const fontLoader = new FontLoader();
    const gltfLoader = new GLTFLoader();

    try {
      // Load all textures
      const texturePromises = state.paragraphs.map(p =>
        new Promise((resolve, reject) => {
          textureLoader.load(p.image, (texture) => {
            texture.minFilter = THREE.LinearFilter;
            resolve(texture);
          }, undefined, reject);
        })
      );

      // Load font
      const fontPromise = new Promise((resolve, reject) => {
        fontLoader.load('/MOONGET_Heavy.blob', resolve, undefined, reject);
      });

      // Load diamond model
      const diamondPromise = new Promise((resolve, reject) => {
        gltfLoader.load('/diamond.glb', resolve, undefined, reject);
      });

      const [textures, font, gltf] = await Promise.all([
        Promise.all(texturePromises),
        fontPromise,
        diamondPromise
      ]);

      this.textures = textures;
      this.font = font;
      this.diamondGeometry = gltf.scene.children[0].geometry;
      this.diamondGeometry.center();

      // Create scene content
      this.createContent();
      this.createDiamonds();
      this.createStartup();

      // Hide loading
      this.loading.classList.add('hidden');

      // Start animation loop
      this.animate();
    } catch (error) {
      console.error('Error loading assets:', error);
      this.loading.textContent = 'Error loading assets';
    }
  }

  createContent() {
    // Intro section - MOKSHA title
    const mokshaText = this.createText('MOKSHA', {
      size: this.contentMaxWidth * 0.08,
      color: '#d40749',
      left: true,
      top: true
    });
    mokshaText.position.set(-this.contentMaxWidth / 3.2, 0.5, -1);
    const mokshaBlock = this.createBlock(mokshaText, { offset: 0, factor: 1.2 });
    this.scene.add(mokshaBlock);

    // Intro DOM text
    this.createDomElement(
      `It was the year 2076.${this.mobile ? '<br />' : ' '}The substance had arrived.`,
      { offset: 0, factor: 1.0 },
      [-this.contentMaxWidth / 3.2, -this.contentMaxWidth * 0.08 + 0.25, -1]
    );

    // "four zero zero" text
    const lines = ['four', 'zero', 'zero'];
    lines.forEach((line, i) => {
      const text = this.createText(line, {
        size: this.contentMaxWidth * 0.15,
        color: '#2fe8c3',
        left: true,
        top: true
      });
      text.position.set(
        -this.contentMaxWidth / 3.5,
        -i * (this.contentMaxWidth / 5),
        -1
      );
      const block = this.createBlock(text, { offset: 5.7, factor: 1.2 });
      this.scene.add(block);
    });

    // Paragraphs
    state.paragraphs.forEach((para, index) => {
      this.createParagraph(para, index);
    });

    // Stripes
    state.stripes.forEach((stripe, index) => {
      const plane = this.createPlane({
        width: 50,
        height: stripe.height,
        color: stripe.color,
        shift: -4
      });
      plane.rotation.z = Math.PI / 8;
      plane.position.z = -10;
      const block = this.createBlock(plane, { offset: stripe.offset, factor: -1.5 });
      this.scene.add(block);
    });

    // Bottom left text
    this.createDomElement(
      'Culture is not your friend.',
      { offset: 8, factor: 1.25 },
      [-this.canvasWidth / 2, -this.canvasHeight / 2, 0],
      'bottom-left'
    );
  }

  createParagraph(para, index) {
    const { offset, factor, header, aspect, text } = para;
    const texture = this.textures[index];
    const w = this.contentMaxWidth;
    const size = aspect < 1 && !this.mobile ? 0.65 : 1;
    const alignRight = (this.canvasWidth - w * size - this.margin) / 2;
    const left = !(index % 2);
    const color = index % 2 ? '#D40749' : '#2FE8C3';
    const pixelWidth = w * state.zoom * size;

    // Create group for this paragraph
    const group = new THREE.Group();
    group.position.x = left ? -alignRight : alignRight;

    // Image plane
    const plane = this.createPlane({
      width: w * size,
      height: (w * size) / aspect,
      map: texture,
      shift: 75,
      offsetFactor: (offset + 1.0) / state.sections
    });
    plane.frustumCulled = false;
    group.add(plane);

    // Header text
    const headerText = this.createText(header, {
      size: w * 0.04,
      color: color,
      left: left,
      right: !left,
      top: true
    });
    headerText.position.set(
      ((left ? -w : w) * size) / 2,
      (w * size) / aspect / 2 + 0.5,
      -1
    );
    group.add(headerText);

    // Section number
    const numText = this.createText('0' + (index + 1), {
      size: w * 0.1,
      color: '#1A1E2A',
      opacity: 0.5
    });
    numText.position.set(
      ((left ? w : -w) / 2) * size,
      (w * size) / aspect / 1.5,
      -10
    );
    // Number has different factor
    const numBlock = this.createBlock(numText, { offset, factor: 0.2 });
    group.add(numBlock);

    const block = this.createBlock(group, { offset, factor });
    this.scene.add(block);

    // DOM text element
    const domWidth = pixelWidth / (this.mobile ? 1 : 2);
    this.createDomElement(
      text,
      { offset, factor },
      [
        (left || this.mobile ? (-w * size) / 2 : 0) + (left ? -alignRight : alignRight),
        (-w * size) / 2 / aspect - 0.4,
        1
      ],
      '',
      { width: domWidth + 'px', textAlign: left ? 'left' : 'right' }
    );
  }

  createBlock(child, { offset, factor }) {
    const outer = new THREE.Group();
    const inner = new THREE.Group();

    outer.position.y = -this.sectionHeight * offset * factor;
    inner.add(child);
    outer.add(inner);

    this.blocks.push({
      inner,
      factor,
      offset
    });

    return outer;
  }

  createPlane({ width = 1, height = 1, segments = 32, color = 'white', shift = 1, opacity = 1, map = null, offsetFactor = 0 }) {
    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    const material = new CustomMaterial();

    if (map) {
      material.map = map;
    } else {
      material.uniforms.color.value = new THREE.Color(color);
    }
    material.opacity = opacity;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;

    this.planeMeshes.push({
      mesh,
      material,
      shift,
      offsetFactor,
      lastTop: 0
    });

    return mesh;
  }

  createText(text, { size = 1, color = 'white', opacity = 1, left = false, right = false, top = false, bottom = false } = {}) {
    const geometry = new TextGeometry(text, {
      font: this.font,
      size: 1,
      height: 0.01,
      curveSegments: 32
    });

    geometry.computeBoundingBox();
    const box = new THREE.Vector3();
    geometry.boundingBox.getSize(box);

    const material = new CustomMaterial();
    material.uniforms.color.value = new THREE.Color(color);
    material.opacity = opacity;

    const mesh = new THREE.Mesh(geometry, material);

    // Position based on alignment
    mesh.position.x = left ? 0 : right ? -box.x : -box.x / 2;
    mesh.position.y = top ? 0 : bottom ? -box.y : -box.y / 2;

    const group = new THREE.Group();
    group.scale.set(size, size, 0.1);
    group.add(mesh);

    this.textMeshes.push({
      material,
      lastTop: 0
    });

    return group;
  }

  createDomElement(text, { offset, factor }, position, className = '', style = {}) {
    const el = document.createElement('div');
    el.className = `dom-element ${className}`;
    el.innerHTML = text;
    Object.assign(el.style, style);
    document.getElementById('root').appendChild(el);

    this.domElements.push({
      element: el,
      position,
      offset,
      factor,
      baseY: -this.sectionHeight * offset * factor
    });
  }

  createDiamonds() {
    const ratio = this.renderer.getPixelRatio();
    const width = window.innerWidth * ratio;
    const height = window.innerHeight * ratio;

    // Create render targets
    this.envFbo = new THREE.WebGLRenderTarget(width, height);
    this.backfaceFbo = new THREE.WebGLRenderTarget(width, height);

    // Create materials
    this.backfaceMaterial = new BackfaceMaterial();
    this.refractionMaterial = new RefractionMaterial({
      envMap: this.envFbo.texture,
      backfaceMap: this.backfaceFbo.texture,
      resolution: [width, height]
    });

    // Create instanced mesh
    this.diamondMesh = new THREE.InstancedMesh(
      this.diamondGeometry,
      this.refractionMaterial,
      state.diamonds.length
    );
    this.diamondMesh.position.z = 50;
    this.diamondMesh.layers.set(1);
    this.scene.add(this.diamondMesh);

    // Dummy object for matrix updates
    this.diamondDummy = new THREE.Object3D();
  }

  createStartup() {
    const geometry = new THREE.PlaneGeometry(100, 100);
    const material = new CustomMaterial();
    material.uniforms.color.value = new THREE.Color('#0e0e0f');
    material.opacity = 1;

    this.startupMesh = new THREE.Mesh(geometry, material);
    this.startupMesh.position.set(0, 0, 200);
    this.startupMesh.scale.set(100, 100, 1);
    this.scene.add(this.startupMesh);
  }

  onScroll(e) {
    state.top.current = e.target.scrollTop;
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.renderer.setSize(width, height);

    const aspect = width / height;
    const frustumSize = height / state.zoom;
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();

    this.updateViewport();

    // Update render targets
    const ratio = this.renderer.getPixelRatio();
    this.envFbo.setSize(width * ratio, height * ratio);
    this.backfaceFbo.setSize(width * ratio, height * ratio);
    this.refractionMaterial.uniforms.resolution.value = [width * ratio, height * ratio];
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const t = this.clock.getElapsedTime() / 2;
    const { pages, zoom } = state;
    const top = state.top.current;

    // Update blocks (parallax)
    this.blocks.forEach(block => {
      const curY = block.inner.position.y;
      block.inner.position.y = lerp(curY, (top / zoom) * block.factor, 0.1);
    });

    // Update plane materials
    this.planeMeshes.forEach(plane => {
      const { material, shift, offsetFactor } = plane;
      material.scale = lerp(
        material.scale,
        offsetFactor - top / ((pages - 1) * this.viewportHeight),
        0.1
      );
      material.shift = lerp(
        material.shift,
        (top - plane.lastTop) / shift,
        0.1
      );
      plane.lastTop = top;
    });

    // Update text materials
    this.textMeshes.forEach(text => {
      text.material.shift = lerp(
        text.material.shift,
        (top - text.lastTop) / 100,
        0.1
      );
      text.lastTop = top;
    });

    // Update DOM elements
    this.domElements.forEach(dom => {
      const { element, position, factor, baseY } = dom;
      const y = baseY + lerp(0, (top / zoom) * factor, 1);

      // Convert 3D position to screen position
      const vec = new THREE.Vector3(position[0], position[1] + y, position[2]);
      vec.project(this.camera);

      const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-vec.y * 0.5 + 0.5) * window.innerHeight;

      element.style.transform = `translate(${x}px, ${screenY}px)`;
    });

    // Update startup fade
    if (this.startupMesh) {
      this.startupMesh.material.opacity = lerp(
        this.startupMesh.material.opacity,
        0,
        0.025
      );
      if (this.startupMesh.material.opacity < 0.01) {
        this.scene.remove(this.startupMesh);
        this.startupMesh = null;
      }
    }

    // Update diamonds
    state.diamonds.forEach((data, i) => {
      const { x, offset, scale, factor } = data;
      const s = (this.contentMaxWidth / 35) * scale;

      data.pos.set(
        this.mobile ? 0 : x,
        lerp(
          data.pos.y,
          -this.sectionHeight * offset * factor + (top / zoom) * factor,
          0.1
        ),
        0
      );

      this.diamondDummy.position.copy(data.pos);
      if (i === state.diamonds.length - 1) {
        this.diamondDummy.rotation.set(0, t, 0);
      } else {
        this.diamondDummy.rotation.set(t, t, t);
      }
      this.diamondDummy.scale.set(s, s, s);
      this.diamondDummy.updateMatrix();
      this.diamondMesh.setMatrixAt(i, this.diamondDummy.matrix);
    });
    this.diamondMesh.instanceMatrix.needsUpdate = true;

    // Multi-pass rendering for diamonds
    this.renderer.autoClear = false;

    // Render environment to FBO
    this.camera.layers.set(0);
    this.renderer.setRenderTarget(this.envFbo);
    this.renderer.clearColor();
    this.renderer.render(this.scene, this.camera);

    // Render backfaces to FBO
    this.renderer.clearDepth();
    this.camera.layers.set(1);
    this.diamondMesh.material = this.backfaceMaterial;
    this.renderer.setRenderTarget(this.backfaceFbo);
    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);

    // Render environment to screen
    this.camera.layers.set(0);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();

    // Render diamonds with refraction
    this.camera.layers.set(1);
    this.diamondMesh.material = this.refractionMaterial;
    this.renderer.render(this.scene, this.camera);
  }
}

// Start app
new App();
