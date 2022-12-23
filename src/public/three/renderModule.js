function setCameraLight(fov, scene){
    const fo = 30;
    const zPosition = 1 / (Math.tan((fo / 2) * (Math.PI / 180)));
    const orbitCamera = new THREE.PerspectiveCamera(fo, 4/3, 0.1, 200);
    
    orbitCamera.position.set(0, 0, zPosition)

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    return orbitCamera
}

function animate(vrm, clock, renderer, scene, camera){
    requestAnimationFrame.apply(animate);
    if (vrm !== undefined){
        vrm.update(clock.getDelta());
    }
    removeBodyPony(vrm);
    renderer.render(scene, camera);
}

function rigRotation(
    vrm,
    name,
    rotation = { x: 0, y: 0, z: 0 },
    dampener = 1,
    lerpAmount = 0.3
    
    ){
    if (vrm === undefined){return}

    const Part = currentVrm.humanoid.getBoneNode(
        THREE.VRMSchema.HumanoidBoneName[name]
      );

    let euler = new THREE.Euler(
        rotation.x * dampener,
        rotation.y * dampener,
        rotation.z * dampener
      );
      let quaternion = new THREE.Quaternion().setFromEuler(euler);
	Part.quaternion.slerp(quaternion, lerpAmount); // interpolate
}

export{setCameraLight}