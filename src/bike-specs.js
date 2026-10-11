// Visual measurements only. Gameplay balance and collision radii stay in shared/.
// Rim diameters and tyre sections are in metres; provenance: docs/MOTORCYCLE_REFERENCES.md.
export const BIKE_VISUALS = {
  cub:{generation:'Super Cub 50 AA04 · photo custom',wheelbase:1.215,seatY:.735,front:[.4318,.060,.060],rear:[.4318,.060,.060],barY:1.015,barWidth:.68,frontDisc:0,rearDisc:0,wire:true,color:0x172b27},
  exciter:{generation:'Exciter 150 2019 · purple custom',wheelbase:1.290,seatY:.795,front:[.4318,.090,.072],rear:[.4318,.120,.084],barY:1.035,barWidth:.665,frontDisc:.267,rearDisc:.220,color:0x7040bf},
  himalayan:{generation:'Himalayan 411 Euro 5 · Granite Black',wheelbase:1.465,seatY:.800,front:[.5334,.090,.081],rear:[.4318,.120,.108],barY:1.120,barWidth:.840,frontDisc:.300,rearDisc:.240,wire:true,color:0x343b3c},
  winner:{generation:'Winner X 150 · photo custom',wheelbase:1.278,seatY:.795,front:[.4318,.090,.072],rear:[.4318,.120,.084],barY:1.035,barWidth:.700,frontDisc:.256,rearDisc:.220,color:0x142027},
  pcx:{generation:'PCX 125/150 2018–2020 · photo custom',wheelbase:1.315,seatY:.764,front:[.3556,.100,.080],rear:[.3556,.120,.084],barY:1.035,barWidth:.745,frontDisc:.220,rearDisc:0,color:0x11171c},
  mt07:{generation:'MT-07 2018–2020 · photo custom',wheelbase:1.400,seatY:.805,front:[.4318,.120,.084],rear:[.4318,.180,.099],barY:1.040,barWidth:.745,frontDisc:.282,rearDisc:.245,color:0x303b3e}
};
export const tyreRadius = tyre => tyre[0]/2+tyre[2];

// Pose anchors measured in the adapted meshes, separate from factory dimensions.
export const BIKE_RIGS={
 cub:{grip:[.30,1.06,.407]},exciter:{seatY:.84,grip:[.300,1.025,.282]},
 himalayan:{grip:[.34,1.175,.45]},winner:{grip:[.30,1.083,.439]},
 pcx:{seatY:.790,grip:[.286,1.036,.137]},mt07:{grip:[.353,1.088,.297]}
};
