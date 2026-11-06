import {clamp, flightTime} from './core.mjs';

const Three = window.THREE;
const up = new Three.Vector3(0, 1, 0);
const colors = {
  blue: [0x15598c, 0x39a9c0],
  rose: [0xa92c55, 0xfb977e],
  ice: [0x277b90, 0x8df3ea],
  aurora: [0x5438a5, 0xa796ef],
  ember: [0xab3d28, 0xffac63]
};
const fabric = (color, roughness = .72, metalness = 0) =>
  new Three.MeshStandardMaterial({ color, roughness, metalness });

function surface(positions, indices, uvs) {
  const geometry = new Three.BufferGeometry();
  geometry.setAttribute('position', new Three.Float32BufferAttribute(positions, 3));
  if (uvs) geometry.setAttribute('uv', new Three.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// A continuous cross-section mesh gives the suit actual shoulder, waist and hip shapes.
function loft(rings, sides = 16) {
  const positions = [], indices = [];
  rings.forEach(([y, width, depth, center = 0], row) => {
    for (let j = 0; j < sides; j++) {
      const angle = j * Math.PI * 2 / sides;
      positions.push(Math.cos(angle) * width, y, center + Math.sin(angle) * depth);
      if (row) {
        const a = (row - 1) * sides + j, b = (row - 1) * sides + (j + 1) % sides;
        indices.push(a, a + sides, b, b, a + sides, b + sides);
      }
    }
  });
  return surface(positions, indices);
}

function curvedPanel(width, height, bow, taper = 0) {
  const positions = [], indices = [], uvs = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 13; col++) {
      const u = col / 12, v = row / 4, edge = u * 2 - 1;
      const vertical = v * 2 - 1;
      positions.push(edge * width * .5 * (1 - taper * vertical ** 4), (v - .5) * height, -edge * edge * bow);
      uvs.push(u, v);
      if (row && col) {
        const a = row * 13 + col;
        indices.push(a - 14, a - 13, a, a - 14, a, a - 1);
      }
    }
  }
  return surface(positions, indices, uvs);
}

function paintedTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new Three.CanvasTexture(canvas);
  texture.encoding = Three.sRGBEncoding;
  return texture;
}

function bibTexture(back) {
  return paintedTexture(256, 288, (ctx, w, h) => {
    ctx.fillStyle = '#f2f7fa';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#132d47';
    ctx.fillRect(0, 0, w, 49);
    ctx.fillStyle = '#91f2d8';
    ctx.fillRect(0, 49, w, 8);
    ctx.font = '800 23px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ALPINE AIR', w / 2, 39);
    ctx.fillStyle = '#193451';
    ctx.font = 'italic 900 132px system-ui';
    ctx.fillText('17', w / 2, 190);
    ctx.font = '800 19px system-ui';
    ctx.fillText(back ? 'FLIGHT TEAM' : 'ALPINE CIRCUIT', w / 2, 233);
    ctx.fillRect(31, h - 28, w - 62, 4);
    ctx.strokeStyle = '#96b8cc';
    ctx.lineWidth = 4;
    ctx.setLineDash([5, 7]);
    ctx.strokeRect(8, 8, w - 16, h - 16);
  });
}

function lensTexture() {
  return paintedTexture(256, 96, (ctx, w, h) => {
    const glass = ctx.createLinearGradient(0, 0, w * .16, h);
    glass.addColorStop(0, '#102b46');
    glass.addColorStop(.39, '#4d9db6');
    glass.addColorStop(.52, '#9be7e1');
    glass.addColorStop(.66, '#d98b68');
    glass.addColorStop(1, '#344364');
    ctx.fillStyle = glass;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b6f1ed';
    ctx.globalAlpha = .40;
    ctx.beginPath();
    ctx.moveTo(0, 33);
    ctx.lineTo(43, 14);
    ctx.lineTo(91, 30);
    ctx.lineTo(157, 17);
    ctx.lineTo(215, 35);
    ctx.lineTo(w, 25);
    ctx.lineTo(w, 48);
    ctx.lineTo(0, 51);
    ctx.fill();
    ctx.globalAlpha = .82;
    ctx.fillRect(29, 12, 66, 4);
  });
}

function skiShape() {
  const sections = [
    [-1.30, .071, .018], [-1.14, .081, 0], [-.43, .071, 0],
    [.20, .069, 0], [.94, .082, 0], [1.23, .082, .026],
    [1.43, .060, .100], [1.54, .022, .158], [1.57, .003, .161]
  ];
  const positions = [], indices = [], uv = [];
  for (let i = 0; i < sections.length; i++) {
    const [z, width, y] = sections[i];
    positions.push(-width, y, z, width, y, z, -width, y - .033, z, width, y - .033, z);
    const v = (z + 1.30) / 2.87;
    uv.push(0,v,1,v,0,v,1,v);
    if (i) {
      const a = (i - 1) * 4, b = i * 4;
      indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,
        a,a+2,b,b,a+2,b+2,a+1,b+1,a+3,a+3,b+1,b+3);
    }
  }
  indices.push(0,1,2,1,3,2,32,34,33,33,34,35);
  return surface(positions, indices, uv);
}

const poses = {
  ready: [1.03, -.07, .05, 0, 0, .13, -.17, .05, -.38, .06],
  tuck: [.73, -.20, 1.03, 0, 0, .12, -.27, .07, -.39, .11],
  launch: [1.01, -.04, .49, .06, 0, .15, -.19, -.05, -.37, -.14],
  glide: [.94, -.13, 1.19, .32, 0, .09, -.22, .02, -.45, .02],
  prepare: [.93, -.09, .61, .04, .28, .23, -.22, .14, -.34, .27],
  absorb: [.72, -.13, .64, 0, .38, .22, -.24, .17, -.35, .37],
  skid: [.68, -.20, .85, .11, .11, .21, -.21, .04, -.30, .29],
  coast: [1.02, -.08, .12, 0, .14, .11, -.20, .02, -.37, .06]
};

export class AlpineAthlete {
  constructor(view, root) {
    this.root = root;
    this.box = view.boxGeo;
    this.sphere = new Three.SphereGeometry(1, 20, 14);
    this.materials = {
      suit: fabric(colors.blue[0]), trim: fabric(colors.blue[1]),
      dark: fabric(0x12283e), rubber: fabric(0x1a3548),
      white: fabric(0xeef5f6, .43), shell: fabric(0xdeeef4, .31),
      skin: fabric(0xd89970), shade: fabric(0x985445),
      brass: fabric(0xf0a560, .32, .16), steel: fabric(0x8daab7, .32, .28)
    };
    this.torso = new Three.Group();
    root.add(this.torso);
    this.buildTorso();
    this.buildHead();
    this.buildLimbs();
    this.current = poses.ready.slice();
    this.scratch = Array.from({length: 7}, () => new Three.Vector3());
    this.animationTarget = new Array(poses.ready.length);
  }

  mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const mesh = new Three.Mesh(geometry, this.materials[material] || material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  block(parent, material, x, y, z, w, h, d) {
    const mesh = this.mesh(parent, this.box, material, x, y, z);
    mesh.scale.set(w, h, d);
    return mesh;
  }

  oval(parent, material, x, y, z, w, h, d) {
    const mesh = this.mesh(parent, this.sphere, material, x, y, z);
    mesh.scale.set(w, h, d);
    return mesh;
  }

  buildTorso() {
    const b = this.torso;
    this.mesh(b, loft([
      [-.155,.005,.005],[-.12,.19,.137],[-.026,.24,.155],[.17,.218,.142],
      [.35,.267,.175],[.50,.301,.166],[.57,.251,.135],[.634,.119,.104],[.65,.004,.004]
    ]), 'suit');
    this.mesh(b, loft([[.54,.14,.12],[.60,.146,.116],[.674,.126,.106],[.70,.108,.103]]), 'dark');
    this.mesh(b, loft([[-.093,.213,.144],[-.054,.238,.155],[-.014,.243,.159],[.024,.24,.158]]), 'dark');
    const bib = curvedPanel(.425, .396, .053);
    for (const back of [false, true]) {
      const number = this.mesh(b, bib, new Three.MeshLambertMaterial({map: bibTexture(back)}),
        0, .319, back ? -.180 : .180);
      number.rotation.y = back ? Math.PI : 0;
    }
    for (const side of [-1, 1]) {
      const shoulder = this.oval(b, 'trim', side * .233, .495, .026, .089, .084, .133);
      shoulder.rotation.z = side * -.42;
      this.oval(b, 'dark', side * .222, .147, .015, .042, .104, .107);
    }
  }

  buildHead() {
    this.head = new Three.Group();
    this.head.position.set(0, .64, .025);
    this.torso.add(this.head);
    const h = this.head;
    this.oval(h, 'dark', 0, .069, 0, .139, .126, .119);
    this.mesh(h, loft([
      [.091,.026,.059,.078],[.119,.115,.116,.060],[.168,.161,.143,.045],
      [.245,.190,.163,.021],[.324,.191,.157,.015],[.408,.151,.127,.012],[.454,.004,.004]
    ]), 'skin');
    this.oval(h, 'skin', 0, .211, .190, .050, .034, .045);
    this.oval(h, 'shade', 0, .152, .161, .048, .011, .022);
    this.mesh(h, loft([
      [.258,.202,.177,-.012],[.284,.222,.196,-.018],[.369,.226,.206,-.023],
      [.461,.204,.186,-.024],[.522,.146,.145,-.028],[.548,.072,.083,-.028],[.552,.002,.002,-.028]
    ], 24), 'shell');
    this.mesh(h, loft([[.271,.209,.187,-.015],[.290,.225,.201,-.019],[.319,.229,.209,-.021]]), 'dark');
    for (const side of [-1, 1]) {
      this.oval(h, 'dark', side * .190, .242, -.025, .055, .105, .104);
      this.oval(h, 'trim', side * .230, .246, -.026, .017, .057, .056);
      this.block(h, 'rubber', side * .150, .183, .095, .028, .108, .025).rotation.z = side * -.34;
      this.block(h, 'brass', side * .177, .273, .133, .060, .035, .044).rotation.y = side * .53;
    }
    this.oval(h, 'dark', 0, .280, .168, .207, .104, .079);
    this.mesh(h, curvedPanel(.367, .135, .033, .19), 'brass', 0, .288, .269);
    this.mesh(h, curvedPanel(.336, .105, .031, .19), new Three.MeshLambertMaterial({map:lensTexture()}), 0, .291, .275);
    for (const x of [-.082, -.043, .043, .082]) {
      this.oval(h, 'dark', x, .505, .105, .013, .006, .039).rotation.x = -.54;
    }
    this.oval(h, 'trim', 0, .520, -.096, .028, .020, .091).rotation.x = -.39;
  }

  buildLimbs() {
    const linkGeometry = loft([[0,.63,.67],[.09,.91,.92],[.34,1,1],[.74,.87,.93],[1,.62,.67]],12);
    const boardGeometry = skiShape();
    const boardMap = paintedTexture(96, 512, (ctx, w, h) => {
      ctx.fillStyle = '#142d46';
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#eb765c';
      ctx.fillRect(8,0,w-16,h);
      ctx.fillStyle = '#ffd5a4';
      for (let y of [63,84,402,423]) {
        ctx.beginPath();
        ctx.moveTo(8,y);
        ctx.lineTo(w-8,y+22);
        ctx.lineTo(w-8,y+32);
        ctx.lineTo(8,y+10);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(55,178);
      ctx.rotate(Math.PI/2);
      ctx.fillStyle = '#172d44';
      ctx.font = '900 24px system-ui';
      ctx.fillText('ALPINE / 17', 0,0);
      ctx.restore();
    });
    const boardMaterial = new Three.MeshLambertMaterial({map:boardMap});
    this.limbs = [-1, 1].map(side => {
      const ski = new Three.Group();
      this.root.add(ski);
      this.mesh(ski, boardGeometry, boardMaterial);
      this.block(ski,'steel',0,.022,.013,.126,.045,.49);
      this.block(ski,'dark',0,.055,.219,.142,.081,.088);
      this.block(ski,'dark',0,.055,-.155,.142,.081,.074);
      this.oval(ski,'rubber',0,.124,.040,.104,.088,.197);
      this.oval(ski,'dark',0,.193,-.035,.090,.125,.120);
      for (const z of [-.02,.078,.151]) {
        this.block(ski,'steel',0,.205-(z+.02)*.19,z,.168,.020,.033);
        this.block(ski,'brass',side*.069,.219-(z+.02)*.19,z,.028,.017,.035);
      }
      const link = (parent, material) => this.mesh(parent,linkGeometry,material);
      return {
        side, ski, thigh: link(this.root,'suit'), calf: link(this.root,'suit'),
        knee: this.oval(this.root,'trim',0,0,0,.112,.108,.100),
        upper: link(this.torso,'suit'), fore: link(this.torso,'dark'),
        elbow: this.oval(this.torso,'trim',0,0,0,.075,.074,.076),
        hand: this.oval(this.torso,'dark',0,0,0,.079,.10,.067),
        cuff: this.oval(this.torso,'white',0,0,0,.077,.040,.073)
      };
    });
  }

  pose(run, intro, dt, reduced) {
    const phase = intro ? 'ready' : run.phase;
    const air = phase === 'flight';
    const progress = air ? clamp(run.t / flightTime(run)) : 0;
    const recovery = phase === 'brake' || phase === 'result' || phase === 'between';
    let target = poses.ready;
    if (phase === 'inrun') target = run.mark ? poses.launch : poses.tuck;
    if (air) {
      if (run.mark && run.land > .25) target = poses.prepare;
      else {
        const ease = clamp(progress / .15);
        target = this.animationTarget;
        for (let i = 0; i < target.length; i++) target[i] = Three.MathUtils.lerp(poses.launch[i],poses.glide[i],ease);
      }
    }
    if (recovery) {
      target = poses.coast;
      if (phase === 'brake') {
        const source = run.land >= .54 ? poses.absorb : poses.skid;
        target = this.animationTarget;
        const rise = clamp((run.t - .24) / .87);
        for (let i = 0; i < target.length; i++) target[i] = Three.MathUtils.lerp(source[i],poses.coast[i],rise);
      }
    }
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 16);
    for (let i = 0; i < target.length; i++) this.current[i] += (target[i] - this.current[i]) * blend;
    const [height, hipZ, pitch, spread, stagger, armOut, elbowY, elbowZ, handY, handZ] = this.current;
    this.torso.position.set(0,height,hipZ);
    this.torso.rotation.x = pitch;
    this.torso.updateMatrix();
    this.head.rotation.x = -pitch * .71;
    const [hip, ankle, knee, shoulder, elbow, hand, axis] = this.scratch;

    const connect = (mesh, a, b, width, depth = width) => {
      axis.subVectors(b,a);
      mesh.position.copy(a);
      mesh.scale.set(width,axis.length(),depth);
      mesh.quaternion.setFromUnitVectors(up,axis.normalize());
    };

    for (const limb of this.limbs) {
      const side = limb.side;
      limb.ski.position.set(side * (.177 + spread * .11),.043,side * stagger);
      limb.ski.rotation.y = side * spread;
      limb.ski.updateMatrix();
      hip.set(side*.143,-.037,0).applyMatrix4(this.torso.matrix);
      ankle.set(0,.207,-.057).applyMatrix4(limb.ski.matrix);
      knee.copy(hip).lerp(ankle,.52);
      knee.z += .115 + pitch * .105;
      knee.x += side * (.016 + spread * .045);
      connect(limb.thigh,hip,knee,.123,.122);
      connect(limb.calf,knee,ankle,.105,.100);
      limb.knee.position.copy(knee);
      shoulder.set(side*.267,.486,.006);
      elbow.set(side*(.27+armOut*.55),.486+elbowY,elbowZ);
      hand.set(side*(.27+armOut),.486+handY,handZ);
      connect(limb.upper,shoulder,elbow,.093);
      connect(limb.fore,elbow,hand,.078);
      limb.elbow.position.copy(elbow);
      limb.hand.position.copy(hand);
      limb.hand.quaternion.copy(limb.fore.quaternion);
      limb.cuff.position.copy(hand).lerp(elbow,.18);
      limb.cuff.quaternion.copy(limb.fore.quaternion);
    }
  }

  setKit(kit) {
    if (kit === this.kit) return;
    this.kit = kit;
    const [main, trim] = colors[kit] || colors.blue;
    this.materials.suit.color.setHex(main);
    this.materials.trim.color.setHex(trim);
  }

  dispose() {
    const geometries = new Set(), materials = new Set();
    this.root.traverse(mesh => {
      if (!mesh.isMesh) return;
      if (mesh.geometry !== this.box) geometries.add(mesh.geometry);
      materials.add(mesh.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => {
      material.map?.dispose();
      material.dispose();
    });
    this.root.removeFromParent();
  }
}
