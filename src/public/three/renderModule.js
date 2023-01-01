 import {getHeadInfo} from "../js/canvas_utils.js"
const lerp = Kalidokit.Vector.lerp;
const modelPath = '/public/vrm/Saitama.vrm'
const girlModelPath = "https://cdn.glitch.com/29e07830-2317-4b15-a044-135e73c7f840%2FAshtra.vrm?v=1630342336981"


function setCameraLight(fov, scene){
    const fo = fov;
    const zPosition = 1 / (Math.tan((fo / 2) * (Math.PI / 180)));
    const orbitCamera = new THREE.PerspectiveCamera(fo, 4/3, 0.1, 200);
    
    orbitCamera.position.set(0, 0, zPosition)

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    return orbitCamera
}

function animate(vrm, clock, renderer, scene, camera){
    console.log(vrm);
    requestAnimationFrame(animate);
    if (vrm){
        vrm.update(clock.getDelta());
        removeBodyPony(vrm);

    }
    renderer.render(scene, camera);
}

function rigRotation(
    vrm,
    name,
    rotation = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = 0.3
    
    ){
    if (!vrm){return}

    const Part = vrm.humanoid.getBoneNode(
        THREE.VRMSchema.HumanoidBoneName[name]
      );
    if (!Part) {return}

    let euler = new THREE.Euler(
        rotation.x * dampener,
        rotation.y * dampener,
        rotation.z * dampener
      );
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
	Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
}

function removeBodyPony(vrm){
    if ( vrm.scene.children[6].name = "wedel" ){
        vrm.scene.children[6].visible = false;  
        vrm.scene.children[5].children[2].visible = false;
    }
    else {
		vrm.scene.children[5].visible = false;  
		vrm.scene.children[6].children[2].visible = false;
	}
    vrm.scene.children[4].visible = false;  // "Kape+Tail"
    vrm.scene.children[3].visible = false;  // "Kape"
}

function setBonePony(vrm, [x, y, z, size]){
    vrm.scene.children[0].children[0].position.set(x,y-0.05,0);  // "RootBone"
    vrm.scene.children[0].children[0].children[0].position.set(0,0,0);  // "HipsBone"
    vrm.scene.children[0].children[0].children[0].children[4].position.set(0,0,0);  // "SpineBone"
    vrm.scene.children[0].children[0].children[0].children[4].children[0].position.set(0,0,0);  // "ChestBone"
    vrm.scene.children[0].children[0].children[0].children[4].children[0].children[1].position.set(x,y,0);// "NeckBone"
    vrm.scene.children[0].children[0].children[0].children[4].children[0].children[1].children[0].position.set(0,-0.3,0);  // "HeadBone"
	vrm.scene.children[0].children[0].children[0].children[4].children[0].children[1].children[0].scale.set(size * 10, size * 10, size * 10);
}

function setBackbonePosition( vrm, [x, y, z, size]){
    vrm.scene.children[0].position.set(x, y, 0);  // "Root"
    vrm.scene.children[0].children[0].position.set(0,0,0);  // "J_Bip_C_Hips"
    vrm.scene.children[0].children[0].children[0].position.set(0,0,0);  // "J_Bip_C_Spine"
    vrm.scene.children[0].children[0].children[0].children[0].position.set(0,0,0);  // "J_Bip_C_Chest"
    vrm.scene.children[0].children[0].children[0].children[0].children[0].position.set(0,0,0);// "J_Bip_C_UpperChest"
    vrm.scene.children[0].children[0].children[0].children[0].children[0].children[5].position.set(x,y,0);  // "J_Bip_C_Neck"
    vrm.scene.children[0].children[0].children[0].children[0].children[0].children[5].children[0].position.set(0,-0.3,0); // "J_Bip_C_Head"
	vrm.scene.children[0].children[0].children[0].children[0].children[0].children[5].children[0].scale.set(size * 30, size * 30, size * 30);
}


const drawResults = (results, guideCanvas, videoElement) => {
	guideCanvas.width = videoElement.videoWidth;
	guideCanvas.height = videoElement.videoHeight;
	let canvasCtx = guideCanvas.getContext('2d');
	canvasCtx.save();
	canvasCtx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);
	canvasCtx.drawImage(results.image, 0, 0, guideCanvas.width, guideCanvas.height);

	// Use `Mediapipe` drawing functions
	drawConnectors(canvasCtx, results.multiFaceLandmarks[0], FACEMESH_TESSELATION, {
	color: "#C0C0C070",
	lineWidth: 1
		});
	if(results.multiFaceLandmarks[0] && results.multiFaceLandmarks[0].length === 478){
	//draw pupils
	drawLandmarks(canvasCtx, [results.multiFaceLandmarks[0][468],results.multiFaceLandmarks[0][468+5]], {
		color: "#ffe603",
		lineWidth: 2
		});
	}
}

function rigFace(riggedFace, vrm, oldLookTarget){
    if(!vrm){return}
	  rigRotation(vrm, "Head", riggedFace.head, 0.7);
  
	  // Blendshapes and Preset Name Schema
	  const Blendshape = vrm.blendShapeProxy;
	  const PresetName = THREE.VRMSchema.BlendShapePresetName;
	
	  // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
	  // for VRM, 1 is closed, 0 is open.
	//   riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
	//   riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1),Blendshape.getValue(PresetName.Blink), .5)
	//   riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye,riggedFace.head.y)
	  riggedFace.eye = Kalidokit.Face.stabilizeBlink({
		l: lerp(clamp(1 - riggedFace.eye.l, 0, 1), Blendshape.getValue(PresetName.BlinkL), .2), 
		r: lerp(clamp(1 - riggedFace.eye.r, 0, 1), Blendshape.getValue(PresetName.BlinkR), .2)
	},riggedFace.head.y)
	  
	  Blendshape.setValue(PresetName.BlinkL, riggedFace.eye.l);
	  Blendshape.setValue(PresetName.BlinkR, riggedFace.eye.r);
	  
	  // Interpolate and set mouth blendshapes
	  Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I,Blendshape.getValue(PresetName.I), .25));
	  Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A,Blendshape.getValue(PresetName.A), .25));
	  Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E,Blendshape.getValue(PresetName.E), .25));
	  Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O,Blendshape.getValue(PresetName.O), .25));
	  Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U,Blendshape.getValue(PresetName.U), .25));
  
	  //PUPILS
	  //interpolate pupil and keep a copy of the value
	  let lookTarget =
		new THREE.Euler(
		  lerp(oldLookTarget.x , riggedFace.pupil.y, .4),
		  lerp(oldLookTarget.y, riggedFace.pupil.x, .4),
		  0,
		  "XYZ"
		)
	  oldLookTarget.copy(lookTarget);
	  vrm.lookAt.applyer.lookAt(lookTarget);
    return oldLookTarget
}

export{
    setCameraLight, 
    animate, 
    rigRotation, 
    setBonePony, 
    removeBodyPony,
    drawResults,
    rigFace
}