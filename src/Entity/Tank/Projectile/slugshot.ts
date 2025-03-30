import {BarrelDefinition, TankDefinition } from "../../../Const/TankDefinitions";
import Barrel from "../Barrel";
import { BarrelBase } from "../TankBody";
import Bullet from "./Bullet";




        

        
     

export default class slugshot extends Bullet {
    public constructor(barrel: Barrel, tank: BarrelBase, tankDefinition: TankDefinition | null, shootAngle: number) {
        // Apply the random variation before passing shootAngle to super
        const angleVariationDegrees = Math.random() * 10 - 5; // random value between -15 and +15
        const modifiedShootAngle = shootAngle + angleVariationDegrees;
        
        super(barrel, tank, tankDefinition, modifiedShootAngle);
        
        const bulletDefinition = barrel.definition.bullet;
        this.baseAccel = barrel.bulletAccel + (Math.floor(Math.random() * 7) - Math.floor(Math.random() * 7));
        this.pierceEffect = true;
        this.baseSpeed = barrel.bulletAccel + 30 + ((Math.floor(Math.random() * 20) / (this.baseAccel / 20)) - (Math.floor(Math.random() * 20)) / (this.baseAccel / 20));
    }

    public tick(tick: number) {
        super.tick(tick);
        
        let BaseAccelDecay = 0.06 * (this.baseAccel / 20);
        this.baseAccel -= BaseAccelDecay;
        if (this.baseAccel < 0.01){
            this.baseAccel = 0;
        }
        
        // TODO:
        // Add the custom resting state AI (after fixing real drone's)
    }
}