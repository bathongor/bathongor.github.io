import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import CannonDebugger from "cannon-es-debugger";
import { bodyToMesh } from "./three-conversion-utils.js";

export default class Experience {
  static instance;
  constructor(canvas) {
    if (Experience.instance) {
      return Experience.instance;
    }
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.initCamera();
    this.initRenderer();
    this.initLight();
    this.initCamControls();
    this.addPlane();
    this.loadGLTF("/car.glb");
    this.initKeyEventListeners();
  }

  initKeyEventListeners = () => {
    document.addEventListener("keydown", (event) => {
      const maxSteerVal = 0.5;
      const maxForce = 1000;
      const brakeForce = 1000000;

      switch (event.key) {
        case "w":
        case "ArrowUp":
          this.vehicle.applyEngineForce(-maxForce, 2);
          this.vehicle.applyEngineForce(-maxForce, 3);
          break;

        case "s":
        case "ArrowDown":
          this.vehicle.applyEngineForce(maxForce, 2);
          this.vehicle.applyEngineForce(maxForce, 3);
          break;

        case "a":
        case "ArrowLeft":
          this.vehicle.setSteeringValue(maxSteerVal, 0);
          this.vehicle.setSteeringValue(maxSteerVal, 1);
          break;

        case "d":
        case "ArrowRight":
          this.vehicle.setSteeringValue(-maxSteerVal, 0);
          this.vehicle.setSteeringValue(-maxSteerVal, 1);
          break;

        case "b":
          this.vehicle.setBrake(brakeForce, 0);
          this.vehicle.setBrake(brakeForce, 1);
          this.vehicle.setBrake(brakeForce, 2);
          this.vehicle.setBrake(brakeForce, 3);
          break;
      }
    });

    // Reset force on keyup
    document.addEventListener("keyup", (event) => {
      switch (event.key) {
        case "w":
        case "ArrowUp":
          this.vehicle.applyEngineForce(0, 2);
          this.vehicle.applyEngineForce(0, 3);
          break;

        case "s":
        case "ArrowDown":
          this.vehicle.applyEngineForce(0, 2);
          this.vehicle.applyEngineForce(0, 3);
          break;

        case "a":
        case "ArrowLeft":
          this.vehicle.setSteeringValue(0, 0);
          this.vehicle.setSteeringValue(0, 1);
          break;

        case "d":
        case "ArrowRight":
          this.vehicle.setSteeringValue(0, 0);
          this.vehicle.setSteeringValue(0, 1);
          break;

        case "b":
          this.vehicle.setBrake(0, 0);
          this.vehicle.setBrake(0, 1);
          this.vehicle.setBrake(0, 2);
          this.vehicle.setBrake(0, 3);
          break;
      }
    });
  };

  initCamera = () => {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, -6);
  };

  initLight = () => {
    this.light = new THREE.PointLight(0xffffff, 1.0, 100);
    this.light.position.set(-20, 20, 20);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 500;
    this.scene.add(this.light);
  };

  initRenderer = () => {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
  };

  initCamControls = () => {
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.update();
  };

  initPhysics = () => {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.81, 0),
    });

    // Build the car chassis
    const approxBox = new THREE.Box3().setFromObject(this.glb);
    const size = approxBox.getSize(new THREE.Vector3());
    size.x /= 2;
    size.y /= 2;
    size.z /= 2;
    const chassisShape = new CANNON.Box(
      new CANNON.Vec3(size.y - 0.2, size.z - 0.2, size.x - 0.2)
    );
    const chassisBody = new CANNON.Body({ mass: 150 });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(0, 4, 0);
    // chassisBody.angularVelocity.set(0, 0.5, 0)

    // Create the vehicle
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody,
    });

    const wheelOptions = {
      radius: 0.45,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      frictionSlip: 1.4,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(0, 0, 1),
      chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
    };

    wheelOptions.chassisConnectionPointLocal.set(
      -size.y + 1.6,
      -0.25,
      size.x - 0.3
    );
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(
      -size.y + 1.6,
      -0.15,
      -size.x + 0.3
    );
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(
      size.y - 1.2,
      -0.15,
      size.x - 0.3
    );
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(
      size.y - 1.2,
      -0.23,
      -size.x + 0.3
    );
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.world);

    // Add the wheel bodies
    const wheelBodies = [];
    const wheelMaterial = new CANNON.Material("wheel");
    this.vehicle.wheelInfos.forEach((wheel) => {
      const cylinderShape = new CANNON.Cylinder(
        wheel.radius,
        wheel.radius,
        wheel.radius / 2,
        20
      );
      const wheelBody = new CANNON.Body({
        mass: 0,
        material: wheelMaterial,
      });
      wheelBody.type = CANNON.Body.KINEMATIC;
      wheelBody.collisionFilterGroup = 0; // turn off collisions
      const quaternion = new CANNON.Quaternion().setFromEuler(
        -Math.PI / 2,
        0,
        0
      );
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
      wheelBodies.push(wheelBody);
      this.world.addBody(wheelBody);
    });

    // Update the wheel bodies
    this.world.addEventListener("postStep", () => {
      for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
        this.vehicle.updateWheelTransform(i);
        const transform = this.vehicle.wheelInfos[i].worldTransform;
        const wheelBody = wheelBodies[i];
        wheelBody.position.copy(transform.position);
        wheelBody.quaternion.copy(transform.quaternion);
      }
    });

    // Add the ground
    const sizeX = 64;
    const sizeZ = 64;
    const matrix = [];
    for (let i = 0; i < sizeX; i++) {
      matrix.push([]);
      for (let j = 0; j < sizeZ; j++) {
        if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeZ - 1) {
          // const height = 3;
          matrix[i].push(50);
          continue;
        }
        matrix[i].push(1);
      }
    }

    const groundMaterial = new CANNON.Material("ground");
    const heightfieldShape = new CANNON.Heightfield(matrix, {
      elementSize: 100 / sizeX,
    });
    const heightfieldBody = new CANNON.Body({
      mass: 0,
      material: groundMaterial,
    });

    heightfieldBody.addShape(heightfieldShape);
    heightfieldBody.position.set(
      -(sizeX * heightfieldShape.elementSize) / 2,
      -1,
      (sizeZ * heightfieldShape.elementSize) / 2
    );
    heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(heightfieldBody);

    // const groundMaterial = new CANNON.Material('ground');
    // const groundBody = new CANNON.Body({
    //   type: CANNON.Body.STATIC,
    //   material: groundMaterial,
    //   shape: new CANNON.Plane(),
    // });
    // groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    // world.addBody(groundBody);

    // Define interactions between wheels and ground
    const wheel_ground = new CANNON.ContactMaterial(
      wheelMaterial,
      groundMaterial,
      {
        friction: 0.3,
        restitution: 0,
        contactEquationStiffness: 1000,
      }
    );
    this.world.addContactMaterial(wheel_ground);

    this.cannonDebugger = new CannonDebugger(this.scene, this.world);
  };

  loadGLTF = (path) => {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../node_modules/three/examples/js/libs/draco/");
    loader.setDRACOLoader(dracoLoader);
    console.log("outisde callback", this.vehicle);
    loader.load(
      path,
      (gltf) => {
        this.glb = gltf.scene;
        this.glb.traverse((node) => {
          if (node.isMesh) node.castShadow = true;
        });
        this.glb.position.y = 5;
        this.glb.rotateX(Math.PI / 2);

        this.scene.add(gltf.scene);
        this.initPhysics();
        console.log("inside callback", this);
        let boundAnimate = this.animate.bind(this);
        this.renderer.setAnimationLoop(boundAnimate);
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );
  };

  addPlane = () => {
    const planeGeometry = new THREE.PlaneGeometry(300, 300);
    const planeMaterial = this.createFloorMaterial();
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotateX((3 / 2) * Math.PI);
    plane.receiveShadow = true;
    this.scene.add(plane);
  };

  createFloorMaterial = () => {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load("/texture.jpg");
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
    });

    return material;
  };

  animate = () => {
    this.renderer.render(this.scene, this.camera);

    if (this.glb && this.vehicle) {
      this.glb.position.copy(this.vehicle.chassisBody.position);
      this.glb.position.y -= 0.85;
      this.glb.quaternion.copy(this.vehicle.chassisBody.quaternion);
      this.glb.rotateY(-Math.PI / 2);
    }

    // if (this.cannonDebugger) {
    //   this.cannonDebugger.update();
    // }

    console.log(this.world.broadphase);
    this.world.fixedStep();
  };
}

const experience = new Experience(document.getElementById("threejscanvas"));
