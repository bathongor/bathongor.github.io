import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import CannonDebugger from 'cannon-es-debugger';

export default class Experience {
  static instance;
  constructor(canvas){
    if(Experience.instance){
      return Experience.instance;
    }
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.initCamera();
    this.initRenderer();
    this.initLight();
    this.initCamControls();
    this.addPlane();
    this.loadGLTF('/car.glb');
    // this.initPhysics();

    // this.renderer.setAnimationLoop(this.animate);

    this.keyStatus = { keys: {
      'ArrowUp': false,
      'ArrowDown': false,
      'ArrowLeft': false,
      'ArrowRight': false
    }, isActive: false};

    this.initKeyEventListeners();
  }

  initKeyEventListeners = () => {
    // document.addEventListener('keydown', (event) => {
    //   if(event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" || event.key == "ArrowRight"){
    //     this.keyStatus.keys[event.key] = true;
    //     this.keyStatus.isActive = true;
    //   }
    // });
  
    // document.addEventListener('keyup', (event) => {
    //   this.keyStatus.keys[event.key] = false;
    //   this.keyStatus.isActive = false;
    // });
    document.addEventListener('keydown', (event) => {
      const maxSteerVal = 0.5
      const maxForce = 1000
      const brakeForce = 1000000

      switch (event.key) {
        case 'w':
        case 'ArrowUp':
          this.vehicle.applyEngineForce(-maxForce, 2)
          this.vehicle.applyEngineForce(-maxForce, 3)
          break

        case 's':
        case 'ArrowDown':
          this.vehicle.applyEngineForce(maxForce, 2)
          this.vehicle.applyEngineForce(maxForce, 3)
          break

        case 'a':
        case 'ArrowLeft':
          this.vehicle.setSteeringValue(maxSteerVal, 0)
          this.vehicle.setSteeringValue(maxSteerVal, 1)
          break

        case 'd':
        case 'ArrowRight':
          this.vehicle.setSteeringValue(-maxSteerVal, 0)
          this.vehicle.setSteeringValue(-maxSteerVal, 1)
          break

        case 'b':
          this.vehicle.setBrake(brakeForce, 0)
          this.vehicle.setBrake(brakeForce, 1)
          this.vehicle.setBrake(brakeForce, 2)
          this.vehicle.setBrake(brakeForce, 3)
          break
      }
    });


    // Reset force on keyup
    document.addEventListener('keyup', (event) => {
      switch (event.key) {
        case 'w':
        case 'ArrowUp':
          this.vehicle.applyEngineForce(0, 2)
          this.vehicle.applyEngineForce(0, 3)
          break

        case 's':
        case 'ArrowDown':
          this.vehicle.applyEngineForce(0, 2)
          this.vehicle.applyEngineForce(0, 3)
          break

        case 'a':
        case 'ArrowLeft':
          this.vehicle.setSteeringValue(0, 0)
          this.vehicle.setSteeringValue(0, 1)
          break

        case 'd':
        case 'ArrowRight':
          this.vehicle.setSteeringValue(0, 0)
          this.vehicle.setSteeringValue(0, 1)
          break

        case 'b':
          this.vehicle.setBrake(0, 0)
          this.vehicle.setBrake(0, 1)
          this.vehicle.setBrake(0, 2)
          this.vehicle.setBrake(0, 3)
          break
      }
    });
  }

  initCamera = () => {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, -6);
  }

  initLight = () => {
    this.light = new THREE.PointLight(0xffffff, 1.0, 100);
    this.light.position.set(-20,20,20);
    this.light.castShadow = true;
    this.light.shadow.mapSize.width = 2048;
    this.light.shadow.mapSize.height = 2048;
    this.light.shadow.camera.near = 0.5;
    this.light.shadow.camera.far = 500;
    this.scene.add(this.light);
  }

  initRenderer = () => {
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, antialias: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    
  }

  initCamControls = () => {
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.update();
  }

  initPhysics = () => {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.81, 0)
    });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    const approxBox = new THREE.Box3().setFromObject(this.glb);
    const size = approxBox.getSize(new THREE.Vector3());
    size.x /= 2;
    size.y /= 2;
    size.z /= 2;
    console.log(size);

    // const testBody = new CANNON.Body({
    //   mass: 5,
    //   shape: new CANNON.Cylinder(),
    // });
    // testBody.position.set(0, 6, 0);

    // this.world.addBody(testBody);
    

    // Build the car chassis
    const chassisBody = new CANNON.Body({
      mass: 150,
    });
    chassisBody.addShape(new CANNON.Box(size));
    chassisBody.position.set(0, 7, 0);
    chassisBody.collisionFilterGroup = 1;
    // chassisBody.collisionFilterMask = -1;

    //Create the vehicle
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody,
    });

    const wheelOptions = {
      mass: 1,  
      radius: 0.5,
      directionLocal: new CANNON.Vec3(0, -2, 0),
      body: new CANNON.Body({
        mass: 1,
        material: new CANNON.Material('wheel')
      }),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      frictionSlip: 1.4,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      maxSuspensionForce: 100000,
      rollInfluence: 0.01,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
      maxSuspensionTravel: 0.3,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true
    }

    wheelOptions.chassisConnectionPointLocal.set(-size.x-0.2, 0, size.z - 2*wheelOptions.radius);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(size.x+0.2, 0, size.z - 2*wheelOptions.radius);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(-size.x-0.2, 0, -size.z + 2*wheelOptions.radius);
    this.vehicle.addWheel(wheelOptions);

    wheelOptions.chassisConnectionPointLocal.set(size.x+0.2, 0, -size.z + 2*wheelOptions.radius);
    this.vehicle.addWheel(wheelOptions);

    this.vehicle.addToWorld(this.world);

    //Add the wheel bodies
    const wheelBodies = [];
    const wheelMaterial = new CANNON.Material('wheel');
    this.vehicle.wheelInfos.forEach((wheel) => {
      const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius/2, 20)
      const wheelBody = new CANNON.Body({
        mass: 1,
        material: wheelMaterial
      });
      wheelBody.type = CANNON.Body.KINEMATIC;
      wheelBody.collisionFilterGroup = 0;
      // wheelBody.collisionFilterMask = 1;
        
      const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI/2, 0, -Math.PI/2);
      wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion);
      wheelBodies.push(wheelBody);
      this.world.addBody(wheelBody);
    });

    //Update the wheel boies
    this.world.addEventListener('postStep', () => {
      for(let i = 0; i < this.vehicle.wheelInfos.length; i++){
        this.vehicle.updateWheelTransform(i);
        const transform = this.vehicle.wheelInfos[i].worldTransform;
        const wheelBody = wheelBodies[i];
        wheelBody.position.copy(transform.position);
        wheelBody.quaternion.copy(transform.quaternion);
      }
    })

    // Define interactions between wheels and ground
    const groundMaterial = new CANNON.Material('groundMaterial  ');
    const wheel_ground = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
      friction: 0.3, 
      restition: 0,
      contactEquationStiffness: 1000,
    })
    this.world.addContactMaterial(wheel_ground);

    
    this.cannonDebugger = new CannonDebugger(this.scene, this.world);
  }

  loadGLTF = (path) => {
    const loader = new GLTFLoader();
    loader.load(path, ( gltf )  => {
      this.glb = gltf.scene;
      this.glb.traverse((node) => {
        if(node.isMesh)
          node.castShadow = true;
      })
      this.glb.position.y = 5;

      
      this.scene.add( gltf.scene );
      this.initPhysics();
      this.renderer.setAnimationLoop(this.animate);

    }, undefined, function ( error ) {
  
      console.error( error );
    });
  }

  addPlane = () => {
    const planeGeometry = new THREE.PlaneGeometry(300, 300);
    const planeMaterial = new THREE.MeshStandardMaterial({color: 0xF5F5F5});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotateX(3/2*Math.PI);
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  animate = () => {
    this.renderer.render(this.scene, this.camera);

    // if(this.glb){
    //   this.glb.position.copy(this.vehicle.position);
    //   this.glb.position.y -= 0.85;
    //   this.glb.quaternion.copy(this.vehicle.quaternion);
    //   console.log(this.glb.position, this.vehicle.position)
    // }

    if(this.cannonDebugger){
      this.cannonDebugger.update();
    }

    console.log(this.world.broadphase)
    this.world.fixedStep();
  }
}

const experience = new Experience(document.getElementById("threejscanvas"));

// let keyStatus = { keys: {
//     'ArrowUp': false,
//     'ArrowDown': false,
//     'ArrowLeft': false,
//     'ArrowRight': false
//   }, isActive: false};


//   document.addEventListener('keydown', (event) => {
//     if(event.key == "ArrowUp" || event.key == "ArrowDown" || event.key == "ArrowLeft" || event.key == "ArrowRight"){
//       keyStatus.keys[event.key] = true;
//       keyStatus.isActive = true;
//     }
//   });

//   document.addEventListener('keyup', (event) => {
//     keyStatus.keys[event.key] = false;
//     keyStatus.isActive = false;
//   });
  
//   const canvas = document.getElementById("threejscanvas");
//   const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
//   renderer.setSize(window.innerWidth, window.innerHeight);
//   renderer.shadowMap.enabled = true;
//   const scene = new THREE.Scene();
//   const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
//   const orbit = new OrbitControls(camera, renderer.domElement);
//   camera.position.set(0, 2, -6);
//   orbit.update();
//   const loader = new GLTFLoader();

//   //Light Config
//   const light = new THREE.PointLight(0xffffff, 1.0, 100);
//   light.position.set(-20,20,20);
//   light.castShadow = true;
//   scene.add(light);

//   light.shadow.mapSize.width = 2048;
//   light.shadow.mapSize.height = 2048;
//   light.shadow.camera.near = 0.5;
//   light.shadow.camera.far = 500;

//   let glb = {};
//   loader.load("/car.glb", ( gltf )  => {
//     glb = gltf.scene;
//     glb.traverse((node) => {
//       if(node.isMesh)
//         node.castShadow = true;
//     })
//     scene.add( gltf.scene );

//   }, undefined, function ( error ) {

//     console.error( error );
//   });

//   const planeGeometry = new THREE.PlaneGeometry(300, 300);
//   const planeMaterial = new THREE.MeshStandardMaterial({color: 0xF5F5F5});
//   const plane = new THREE.Mesh(planeGeometry, planeMaterial);
//   plane.rotateX(3/2*Math.PI);
//   plane.receiveShadow = true;
//   scene.add(plane);

//   function animate() {
//       if(keyStatus.isActive){
//         const up = keyStatus.keys["ArrowUp"];
//         const down = keyStatus.keys["ArrowDown"];
//         const left = keyStatus.keys["ArrowLeft"];
//         const right = keyStatus.keys["ArrowRight"];

//         if(up || down){
//           if(left){
//             glb.position.x += 0.1;
//             if(up)glb.rotateY(0.005);
//             if(down)glb.rotateY(-0.005);
//           }
//           else if(right){
//             glb.position.x -= 0.1;
//             if(up)glb.rotateY(-0.005);
//             if(down)glb.rotateY(0.005);
//           }
//           else {
//             if(up)glb.position.z += 0.1;
//             if(down)glb.position.z -= 0.1;
//           }
//         }
//       }
//       renderer.render(scene, camera);
//   }

//   renderer.setAnimationLoop(animate);

//   const helper = new THREE.CameraHelper(light.shadow.camera);
//   scene.add(helper);