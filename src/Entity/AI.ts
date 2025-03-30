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

import GameServer from "../Game";
import Vector, { VectorAbstract } from "../Physics/Vector";
import LivingEntity from "./Live";
import ObjectEntity from "./Object";
import TankBody from "./Tank/TankBody";

import { InputFlags, PhysicsFlags } from "../Const/Enums";
import { Entity } from "../Native/Entity";
import { tps } from "../config";

// Beware
// The logic in this file is somewhat messed up

/**
 * Used for simplifying the current state of the AI.
 * - `idle`: When the AI is idle
 * - `target`: When the AI has found a target
 */
export const enum AIState {
    idle = 0,
    hasTarget = 1,
    possessed = 3
}

/**
 * Inputs are the shared thing between AIs and Clients. Both use inputs
 * and both can replace eachother.
 */
export class Inputs {
    /**
     * InputFlags.
     */
    public flags = 0;
    /** Mouse position */
    public mouse: Vector = new Vector();
    /** Movement direction */
    public movement: Vector = new Vector();
    /** Whether the inputs are deleted or not. */
    public deleted = false;

    public constructor() { }

    public attemptingShot(): boolean {
        return !!(this.flags & InputFlags.leftclick);
    }
    public attemptingRepel(): boolean {
        return !!(this.flags & InputFlags.rightclick);
    }
}

/**
 * The Intelligence behind Auto Turrets.
 */
export class AI {
    /** Default static rotation that Auto Turrets rotate when in passive mode. */
    public static PASSIVE_ROTATION = 0.01;
    /** Whether a player < FullAccess can claim */
    public isClaimable: boolean = false;

    /** Specific rotation of the AI in passive mode. */
    public passiveRotation = Math.random() < .5 ? AI.PASSIVE_ROTATION : -AI.PASSIVE_ROTATION;
    /** View range in diep units. */
    public viewRange = 1700;
    /** The state of the AI. */
    public state = AIState.idle;

    /** The inputs, which are more like outputs for the AI. */
    public inputs: Inputs = new Inputs();
    /** The entity's whose AI is `this`. */
    public owner: ObjectEntity;
    /** The current game. */
    public game: GameServer;
    /** The AI's target. */
    public target: ObjectEntity | null = null;
    /** The speed at which the ai's owner can move. */
    public movementSpeed = 1;
    /** The speed at which the ai can reach the target. */
    public aimSpeed = 1;
    /** If the AI should predict enemy's movements, and aim accordingly. */
    public doAimPrediction: boolean = false;

    /** Target filter letting owner classes filter what can't be a target by position - false = not valid target */
    public targetFilter: (possibleTargetPos: VectorAbstract) => boolean;

    /** Stores the creation of the AI, used to optimize ticking */
    private _creationTick: number;

    private _findTargetInterval: number = 2;

    public constructor(owner: ObjectEntity, claimable?: boolean) {
        this.owner = owner;
        this.game = owner.game;
        this._creationTick = this.game.tick;

        this.inputs.mouse.set({
            x: 20,
            y: 0
        });

        this.targetFilter = () => true;
        if (claimable) this.isClaimable = true;

        this.game.entities.AIs.push(this);
    }

    /* Finds the closest entity in a different team */
    public findTarget(tick: number) {
        // If there's a target interval, wait until the proper tick to search for a new target.
        if (this._findTargetInterval !== 0 && ((tick + this._creationTick) % this._findTargetInterval) !== 1)  {
            return Entity.exists(this.target) ? this.target : (this.target = null);
        }
    
        const rootPos = this.owner.rootParent.positionData.values;
        const team = this.owner.relationsData.values.team;
    
        // If we already have a target and it remains valid, keep it.
        if (Entity.exists(this.target)) {
            if (team !== this.target.relationsData.values.team && this.target.physicsData.values.sides !== 0) {
                const targetDistSq = (this.target.positionData.values.x - rootPos.x) ** 2 + (this.target.positionData.values.y - rootPos.y) ** 2;
                if (this.targetFilter(this.target.positionData.values) && targetDistSq < (this.viewRange ** 2) * 2)
                    return this.target;
            }
        }
    
        const root = this.owner.rootParent === this.owner && this.owner.relationsData.values.owner instanceof ObjectEntity
            ? this.owner.relationsData.values.owner
            : this.owner.rootParent;
        const entities = this.viewRange === Infinity
            ? this.game.entities.inner.slice(0, this.game.entities.lastId)
            : this.game.entities.collisionManager.retrieve(root.positionData.values.x, root.positionData.values.y, this.viewRange, this.viewRange);
    
        let closestEntity: LivingEntity | null = null;
        let bestPriority = Infinity;
        let bestDistSq = Infinity;
    
        // Helper: lower numbers = higher priority.
        function getPriority(entity: LivingEntity): number {
            // Tanks: highest priority
            if (entity instanceof TankBody) return 1;
            // Crashers: next priority. (Assumes entity.definition.type is defined for crashers)
            else return 2;
        }
    
        for (let i = 0; i < entities.length; ++i) {
            const entity = entities[i];
    
            // Filter out invalid targets.
            if (!(entity instanceof LivingEntity)) continue;
            if (entity.physicsData.values.flags & PhysicsFlags.isBase) continue;
            if (entity.styleData.opacity < 0.5) continue;
            if (!(entity.relationsData.values.owner === null || !(entity.relationsData.values.owner instanceof ObjectEntity))) continue;
            if (entity.relationsData.values.team === team || entity.physicsData.values.sides === 0) continue;
            if (!this.targetFilter(entity.positionData.values)) continue;
    
            const distSq = (entity.positionData.values.x - rootPos.x) ** 2 + (entity.positionData.values.y - rootPos.y) ** 2;
            const priority = getPriority(entity);
    
            // First compare priority, then distance.
            if (priority < bestPriority) {
                bestPriority = priority;
                bestDistSq = distSq;
                closestEntity = entity;
            } else if (priority === bestPriority && distSq < bestDistSq) {
                bestDistSq = distSq;
                closestEntity = entity;
            }
        }
    
        return this.target = closestEntity;
    }
    /** Aims and predicts at the target. */
    public aimAt(target: ObjectEntity) {

        const movementSpeed = this.aimSpeed * 1.6;
        const ownerPos = this.owner.getWorldPosition();

        const pos = {
            x: target.positionData.values.x,
            y: target.positionData.values.y,
        }

        if (movementSpeed <= 0.001) { // Pls no weirdness

            this.inputs.movement.set({
                x: pos.x - ownerPos.x,
                y: pos.y - ownerPos.y
            });

            this.inputs.mouse.set(pos);

            // this.inputs.movement.angle = Math.atan2(delta.y, delta.x);
            this.inputs.movement.magnitude = 1;
            return;
        }
        if (this.doAimPrediction) {
            const delta = {
                x: pos.x - ownerPos.x,
                y: pos.y - ownerPos.y
            }

            let dist = Math.sqrt(delta.x ** 2 + delta.y ** 2);
            if (dist === 0) dist = 1;

            const unitDistancePerp = {
                x: delta.y / dist,
                y: -delta.x / dist
            }

            let entPerpComponent = unitDistancePerp.x * target.velocity.x + unitDistancePerp.y * target.velocity.y;

            if (entPerpComponent > movementSpeed * 0.9) entPerpComponent = movementSpeed * 0.9;

            if (entPerpComponent < movementSpeed * -0.9) entPerpComponent = movementSpeed * -0.9;

            const directComponent = Math.sqrt(movementSpeed ** 2 - entPerpComponent ** 2);
            const offset = (entPerpComponent / directComponent * dist) / 1;

            this.inputs.mouse.set({
                x: pos.x + offset * unitDistancePerp.x,
                y: pos.y + offset * unitDistancePerp.y
            });

        } else {
            this.inputs.mouse.set({
                x: pos.x,
                y: pos.y
            });
        }

        this.inputs.movement.magnitude = 1;
        this.inputs.movement.angle = Math.atan2(this.inputs.mouse.y - ownerPos.y, this.inputs.mouse.x - ownerPos.x);
    }

    public tick(tick: number) {
        // If its being posessed, but its possessor is deleted... then just restart;
        if (this.state === AIState.possessed) {
            if (!this.inputs.deleted) return;

            this.inputs = new Inputs();
        }

        const target = this.findTarget(tick);
        
        if (!target || target.styleData.opacity < 0.25) {
            this.inputs.flags = 0;
            this.state = AIState.idle;
            const angle = this.inputs.mouse.angle + this.passiveRotation;

            this.inputs.mouse.set({
                x: Math.cos(angle) * 100,
                y: Math.sin(angle) * 100
            });
        } else {
            this.state = AIState.hasTarget;
            this.inputs.flags |= InputFlags.leftclick;
            this.aimAt(target);
        }
    }
}
