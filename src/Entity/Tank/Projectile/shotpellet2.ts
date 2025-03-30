/*
    DiepCustom - custom tank game server that shares diep.io's WebSocket protocol
    Copyright (C) 2022 ABCxFF (github.com/ABCxFF)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>
*/

import {BarrelDefinition, TankDefinition } from "../../../Const/TankDefinitions";
import Barrel from "../Barrel";
import { BarrelBase } from "../TankBody";
import Bullet from "./Bullet";


export default class ShotPellet2 extends Bullet {
    public constructor(barrel: Barrel,  tank: BarrelBase, tankDefinition: TankDefinition | null, shootAngle: number) {
        super(barrel, tank, tankDefinition, shootAngle);
        
        const bulletDefinition = barrel.definition.bullet;
        this.baseAccel = barrel.bulletAccel + (Math.floor(Math.random()*15+0) - Math.floor(Math.random()*15+0));
        this.pierceEffect = false;
        this.baseSpeed = barrel.bulletAccel + 30 + ((Math.floor(Math.random()*25+0) * (this.baseAccel / 20)) - (Math.floor(Math.random()*25+0)) * (this.baseAccel / 20));
        
        
    }

    public tick(tick: number) {
        super.tick(tick);
        
        let BaseAccelDecay = 0.3 * (this.baseAccel / 20);
        this.baseAccel -= BaseAccelDecay;
        if (this.baseAccel < 0.01){
            this.baseAccel = 0
        }
        
        

        
     


       
    }
    // TODO:
    // Add the custom resting state AI (after fixing real drone's)
}