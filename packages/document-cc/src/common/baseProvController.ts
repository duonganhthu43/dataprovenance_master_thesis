import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
    ConvectorController
} from '@worldsibu/convector-core';
import { BaseObjWithAtt } from '.';
import { User } from '../user/user.model'
import { BaseModel } from './baseModel.model';
import { basename } from 'path';
import { DataProvenance, Activity, Entity, Chapter, Agent, WasDerivedFrom, ProvenananeGenerator, ActedOnBehalfOf, WasAssociatedWith, WasAttributedTo, WasGeneratedBy } from '../data-provenance';
import { Utilities } from './utilities';
import { BaseController } from './baseController';

export abstract class BaseProvController<T extends BaseModel<T>> extends BaseController<T>  {
    abstract async onCreate(modelInfo: any, sender: User): Promise<T>
    abstract async onCreateProv(currentSender: User, currentEntity: T, dataInfo: any)
    abstract async onUpdate_Validate(modelInfo): Promise<T>
    abstract async onUpdate(oldModel: T, newInfo: any, sender: User): Promise<T>
    abstract async onDelete_validate(modelInfo: any, sender: User): Promise<T>
    abstract async onFindDiff(oldValue, newValue): Promise<any[]>
    abstract async associatedAgent_create(newValue: T, info: any): Promise<Agent[]>
    async create(modelInfo: any): Promise<T> {
        let currentSender = await this.validateCurrentSender()
        let savedModel = await this.onCreate(modelInfo, currentSender)
        let provInfo = await this.onCreateProv(currentSender, savedModel, modelInfo)
        return <T>savedModel.toJSON(true)
    }

    async createMultiple(arrayModelInfo: any): Promise<string[]> {
        let currentSender = await this.validateCurrentSender()
        if (!Array.isArray(arrayModelInfo) && arrayModelInfo.length > 0) {
            throw new Error('Input must be non-empty array object')
        }
        let result = []
        try {
            for (var i = 0; i < arrayModelInfo.length; i++) {
                let savedModel = await this.onCreate(arrayModelInfo[i], currentSender)
                let provInfo = await this.onCreateProv(currentSender, savedModel, arrayModelInfo[i])
                result = result.concat(savedModel.id)
            }
            return result
        } catch (err) {
            console.log('======= err for createMultiple', err)
            return err
        }
    }

    async updateMultiple(arrayModelInfo: any): Promise<string[]> {
        let currentSender = await this.validateCurrentSender()
        if (!Array.isArray(arrayModelInfo) && arrayModelInfo.length > 0) {
            throw new Error('Input must be non-empty array object')
        }
        let result = []
        try {
            for (var i = 0; i < arrayModelInfo.length; i++) {
                let savedModel = await this.baseUpdate(arrayModelInfo[i])
                result = result.concat(savedModel.id)
            }
            return result
        } catch (err) {
            console.log('======= err for updateMultiple', err)
            return err
        }
    }

    async deleteMultiple(arrayModelInfo: any): Promise<string[]> {
        if (!Array.isArray(arrayModelInfo) && arrayModelInfo.length > 0) {
            throw new Error('Input must be non-empty array object')
        }
        let result: string[] = []
        try {
            for (var i = 0; i < arrayModelInfo.length; i++) {
                let savedModel = await this.delete(arrayModelInfo[i])
                result = result.concat(savedModel)
            }
            return result
        } catch (err) {
            console.log('======= err for deleteMultiple', err)
            return err
        }
    }

    async batchUpdate(multipleUpdateInfo: any): Promise<any> {
        // array modelInfo will be:  { add: [], update: [], delete: []}
        let currentSender = await this.validateCurrentSender()
        if (!multipleUpdateInfo) {
            throw new Error('multipleUpdateInfo model is not valid')
        }
        let addArray = multipleUpdateInfo.add
        let updateArray = multipleUpdateInfo.update
        let deleteArray = multipleUpdateInfo.delete
        let batchResult = { add: undefined, update: undefined, delete: undefined }
        if (addArray && Array.isArray(addArray) && addArray.length > 0) {
            batchResult.add = await this.createMultiple(addArray)
        }
        if (updateArray && Array.isArray(updateArray) && updateArray.length > 0) {
            batchResult.update = await this.updateMultiple(updateArray)
        }
        if (deleteArray && Array.isArray(deleteArray) && deleteArray.length > 0) {
            batchResult.delete = await this.deleteMultiple(deleteArray)
        }
        return batchResult
    }

    async baseUpdate(modelInfo: any): Promise<T> {
        try {
            let currentSender = await this.validateCurrentSender()
            let oldModel = await this.onUpdate_Validate(modelInfo)
            let oldValue = Object.assign({}, oldModel.toJSON(true))
            let updatedModel = await this.onUpdate(oldModel, modelInfo, currentSender)
            let newValue = Object.assign({}, updatedModel.toJSON(true))
            let diff = await this.onFindDiff(oldValue, newValue)
            if (!diff || diff.length < 1) { return <T>oldModel.toJSON(true) }
            await this.provenanceInfo_update(updatedModel, currentSender, modelInfo, oldModel, diff)
            await updatedModel.save()
            return <T>updatedModel.toJSON(true)
        } catch (err) {
            console.log('==== err in update ', err)
        }

    }

    async delete(modelInfo: any): Promise<string> {
        let currentSender = await this.validateCurrentSender()
        let dataToDelete = await this.onDelete_validate(modelInfo, currentSender)
        if (!dataToDelete) {
            throw new Error('Current User or model is not authorize to perform delete')
        }
        // get objectTo delete
        await this.provenanceInfo_updateByDeleteAction(modelInfo, currentSender)
        await dataToDelete.delete()
        return modelInfo.id

    }

    async provenanceInfo_updateByDeleteAction(modelInfo: any, sender: User): Promise<void> {
        let lstDataProvenance = await DataProvenance.query(DataProvenance, {
            "selector": {
                type: new DataProvenance().type,
                associated_with_obj_id: modelInfo.id,
                object_type: modelInfo.type
            }
        }) as DataProvenance[]

        if (lstDataProvenance.length !== 1) {
            throw new Error(`Cannot find story related to this ${modelInfo.type} ` + modelInfo['id'] + 'from ' + modelInfo['source'])
        }
        let updatedProvenance = lstDataProvenance[0]
        let currentAgent = this.createAgentFromCurrentSender(sender)

        let associatedAgent = []
        //let userInfoAssociatied = { ...entityInfo['user'] }
        // manually remove user info
        delete modelInfo["user"]
        let currentEntity = this.currentEntity_create(modelInfo)
        let associatedEntity = await this.associatedEntity_create(modelInfo)
        // create delete activity
        let deleteActivity = this.createActivityWithName(`deleted_${modelInfo.type}`)
        // create provenance relation
        let arrayProv = []
        // create wasGeneratedBy_info

        let wasGeneratedBy_info = new WasGeneratedBy()
        wasGeneratedBy_info.activity = ProvenananeGenerator.getProvName(deleteActivity)
        wasGeneratedBy_info.entity = ProvenananeGenerator.getProvName(currentEntity)
        arrayProv = arrayProv.concat(wasGeneratedBy_info)

        // create wasAttributedTo
        let waAttributedTo_info = new WasAttributedTo()
        waAttributedTo_info.entity = ProvenananeGenerator.getProvName(currentEntity)
        waAttributedTo_info.agent = associatedAgent && associatedAgent.length > 0 ? ProvenananeGenerator.getProvName(associatedAgent[0]) : ProvenananeGenerator.getProvName(currentAgent)
        arrayProv = arrayProv.concat(waAttributedTo_info)

        // create actedOnBehalf 
        let wasAssociatedWith_info = new WasAssociatedWith()
        wasAssociatedWith_info.agent = ProvenananeGenerator.getProvName(currentAgent)
        wasAssociatedWith_info.activity = ProvenananeGenerator.getProvName(deleteActivity)
        wasAssociatedWith_info.role = this.getUserType(sender)
        arrayProv = arrayProv.concat(wasAssociatedWith_info)
        // create actedOnBehalf 
        if (associatedAgent && associatedAgent.length > 0) {
            let actedOnBehalfOf_info = new ActedOnBehalfOf()
            actedOnBehalfOf_info.delegate = ProvenananeGenerator.getProvName(currentAgent)
            actedOnBehalfOf_info.responsible = ProvenananeGenerator.getProvName(associatedAgent[0])
            actedOnBehalfOf_info.createAuditField(this.sender)
            arrayProv = arrayProv.concat(actedOnBehalfOf_info)
        }
        let chapter = new Chapter
        chapter.createAuditField(this.sender)
        chapter.entities = [currentEntity].concat(associatedEntity)
        chapter.activities = [deleteActivity]
        chapter.agents = [currentAgent].concat(associatedAgent)
        chapter.provenanceInfo = arrayProv
        updatedProvenance.story = updatedProvenance.story.concat(chapter)
        return await updatedProvenance.save()
    }


    public currentEntity_create(entityValue: T): Entity {
        let entity = new Entity()
        entity.associated_type = entityValue.type
        entity.info = entityValue.toJSON(true)
        entity.name = entityValue.name
        return entity
    }

    public async associatedEntity_create(info: any) {
        return []
    }

    public async provenanceInfo_create(newValue: T, currentSender: User, info: any) {
        let currentAgent = this.createAgentFromCurrentSender(currentSender)
        let associatedAgent = await this.associatedAgent_create(newValue, info)
        delete info["user"]
        let currentEntity = this.currentEntity_create(newValue)
        let associatedEntity = await this.associatedEntity_create(info)
        // create new activity
        let newActivity = this.createActivityWithName(`create_new_${newValue.type}`)
        let arrayProv = []

        let wasGeneratedBy_info = new WasGeneratedBy()
        wasGeneratedBy_info.activity = ProvenananeGenerator.getProvName(newActivity)
        wasGeneratedBy_info.entity = ProvenananeGenerator.getProvName(currentEntity)
        if (newValue.type === 'dataset') {
            console.log('====== entity create currentEntity.info', currentEntity.info)
            console.log('====== entity create currentEntity.info typeof', typeof currentEntity.info)

            console.log('====== entity create generateDatasetHashName MD5', ProvenananeGenerator.generateDatasetHashName(currentEntity.info))
            console.log('====== entity create getProvName MD5', ProvenananeGenerator.getProvName(currentEntity))


        }
        arrayProv = arrayProv.concat(wasGeneratedBy_info)

        // create wasAttributedTo
        let waAttributedTo_info = new WasAttributedTo()
        waAttributedTo_info.entity = ProvenananeGenerator.getProvName(currentEntity)
        waAttributedTo_info.agent = associatedAgent && associatedAgent.length > 0 ? ProvenananeGenerator.getProvName(associatedAgent[0]) : ProvenananeGenerator.getProvName(currentAgent)
        arrayProv = arrayProv.concat(waAttributedTo_info)

        // create actedOnBehalf 
        let wasAssociatedWith_info = new WasAssociatedWith()
        wasAssociatedWith_info.agent = ProvenananeGenerator.getProvName(currentAgent)
        wasAssociatedWith_info.activity = ProvenananeGenerator.getProvName(newActivity)
        wasAssociatedWith_info.role = this.getUserType(currentSender)
        arrayProv = arrayProv.concat(wasAssociatedWith_info)
        // create actedOnBehalf 
        if (associatedAgent && associatedAgent.length > 0) {
            let actedOnBehalfOf_info = new ActedOnBehalfOf()
            actedOnBehalfOf_info.delegate = ProvenananeGenerator.getProvName(currentAgent)
            actedOnBehalfOf_info.responsible = ProvenananeGenerator.getProvName(associatedAgent[0])
            actedOnBehalfOf_info.createAuditField(this.sender)
            arrayProv = arrayProv.concat(actedOnBehalfOf_info)
        }
        let chapter = new Chapter
        chapter.createAuditField(this.sender)
        chapter.entities = [currentEntity].concat(associatedEntity)
        chapter.activities = [newActivity]
        chapter.agents = [currentAgent].concat(associatedAgent)
        chapter.provenanceInfo = arrayProv
        let datasetProvenance = new DataProvenance()
        datasetProvenance.associated_with_obj_id = newValue.id
        datasetProvenance.object_type = newValue.type
        datasetProvenance.story = [chapter]
        datasetProvenance.id = this.tx.stub.generateUUID(`${currentSender.type}provenance-${datasetProvenance.associated_with_obj_id}-${datasetProvenance.object_type}`)
        return await datasetProvenance.save()
    }

    public async provenanceInfo_extra_update(updatedValue: T, currentSender: User, info: any, oldValue: any, detailDifference: any, currentChapter: Chapter): Promise<Chapter> {
        return currentChapter
    }

    public async provenanceInfo_update(updatedValue: T, currentSender: User, info: any, oldValue: T, detailDifference: any) {
        let lstDataProvenance = await DataProvenance.query(DataProvenance, {
            "selector": {
                type: new DataProvenance().type,
                associated_with_obj_id: updatedValue.id,
                object_type: updatedValue.type
            }
        }) as DataProvenance[]

        if (lstDataProvenance.length !== 1) {
            throw new Error(`Cannot find story related to this ${updatedValue.type} ` + updatedValue['id'] + 'from ' + updatedValue['source'])
        }
        let updatedProvenance = lstDataProvenance[0]
        let currentAgent = this.createAgentFromCurrentSender(currentSender)

        let associatedAgent = await this.associatedAgent_create(updatedValue, info)
        //let userInfoAssociatied = { ...entityInfo['user'] }
        // manually remove user info
        delete info["user"]
        let currentEntity = this.currentEntity_create(updatedValue)
        let associatedEntity = await this.associatedEntity_create(info)
        // create new activity
        let updatedActivity = this.createActivityWithName(`updated_${updatedValue.type}`)

        updatedActivity.info = detailDifference
        // create provenance relation
        let arrayProv = []
        // create wasGeneratedBy_info

        let wasGeneratedBy_info = new WasGeneratedBy()
        wasGeneratedBy_info.activity = ProvenananeGenerator.getProvName(updatedActivity)
        wasGeneratedBy_info.entity = ProvenananeGenerator.getProvName(currentEntity)
        arrayProv = arrayProv.concat(wasGeneratedBy_info)

        // create wasAttributedTo
        let waAttributedTo_info = new WasAttributedTo()
        waAttributedTo_info.entity = ProvenananeGenerator.getProvName(currentEntity)
        waAttributedTo_info.agent = associatedAgent && associatedAgent.length > 0 ? ProvenananeGenerator.getProvName(associatedAgent[0]) : ProvenananeGenerator.getProvName(currentAgent)
        arrayProv = arrayProv.concat(waAttributedTo_info)

        // create actedOnBehalf 
        let wasAssociatedWith_info = new WasAssociatedWith()
        wasAssociatedWith_info.agent = ProvenananeGenerator.getProvName(currentAgent)
        wasAssociatedWith_info.activity = ProvenananeGenerator.getProvName(updatedActivity)
        wasAssociatedWith_info.role = this.getUserType(currentSender)
        arrayProv = arrayProv.concat(wasAssociatedWith_info)
        // create actedOnBehalf 
        if (associatedAgent && associatedAgent.length > 0) {
            let actedOnBehalfOf_info = new ActedOnBehalfOf()
            actedOnBehalfOf_info.delegate = ProvenananeGenerator.getProvName(currentAgent)
            actedOnBehalfOf_info.responsible = ProvenananeGenerator.getProvName(associatedAgent[0])
            actedOnBehalfOf_info.createAuditField(this.sender)
            arrayProv = arrayProv.concat(actedOnBehalfOf_info)
        }



        // create derived From
        let wasDerivedFrom = new WasDerivedFrom()
        wasDerivedFrom.generatedEntity = ProvenananeGenerator.getProvName(currentEntity)
        // find latest entity have same id
        if (updatedActivity.name === 'updated_dataset') {
            console.log('===== wasDerivedFrom.usedEntity ', oldValue.toJSON(true))
            console.log('===== hash generateDatasetHashName', ProvenananeGenerator.generateDatasetHashName(oldValue.toJSON(true)))
            let testing = this.currentEntity_create(oldValue)
            let testString = ProvenananeGenerator.getProvName(testing)
            console.log('===== reproduce testing.info', testing.info)
            console.log('===== reproduce string', testString)

        }
        wasDerivedFrom.usedEntity = ProvenananeGenerator.generateDatasetHashName(oldValue.toJSON(true))
        arrayProv = arrayProv.concat(wasDerivedFrom)



        let chapter = new Chapter
        chapter.createAuditField(this.sender)
        chapter.entities = [currentEntity].concat(associatedEntity)
        chapter.activities = [updatedActivity]
        chapter.agents = [currentAgent].concat(associatedAgent)
        chapter.provenanceInfo = arrayProv
        chapter = await this.provenanceInfo_extra_update(updatedValue, currentSender, info, oldValue, detailDifference, chapter)

        updatedProvenance.story = updatedProvenance.story.concat(chapter)
        return await updatedProvenance.save()
    }

    public createActivityWithName(name: string) {
        let activitity = new Activity()
        activitity.name = name
        return activitity
    }
    public createRelatedEntity(entityRelated: T, datasetInfo: any) {
        let entity = new Entity()
        entity.associated_type = entityRelated.type
        entity.info = entityRelated.toJSON(true)
        entity.name = entityRelated.name
        return entity
    }

    public async chapter_createNew(currentSender: User, userInfoAssociatied: any, currentValue: T, info: any) {
        let chapter = await this.onCreateAgentsAndEntity(currentSender, userInfoAssociatied, currentValue, info)
        let activitity = this.createActivityWithName(`create_new_${currentValue.type}`)
        chapter.activities = [activitity]
        return chapter
    }
    public createAgentFromCurrentSender(currentSender: User) {
        let currentSender_Agent = new Agent()
        currentSender_Agent.id = currentSender.id
        currentSender_Agent.associated_type = currentSender.type
        currentSender_Agent.name = currentSender.name
        currentSender_Agent.info = currentSender.toJSON(true)
        return currentSender_Agent
    }
    public async onCreateAgentsAndEntity(currentSender: User, userInfoAssociatied: any, currentValue: T, info: any) {
        let chapter = new Chapter
        // create agent from current sender

        let currentSender_Agent = this.createAgentFromCurrentSender(currentSender)
        chapter.agents = [currentSender_Agent]
        // checking if have associatied agent
        let associatedAgent: Agent = await this.createAgentFromUserAssociated(userInfoAssociatied);
        if (associatedAgent) {
            chapter.agents = chapter.agents.concat(associatedAgent)
        }
        // create current related entity
        let entity = this.createRelatedEntity(currentValue, info)
        chapter.entities = [entity]
        return chapter
    }
    public async createAgentFromUserAssociated(userInfoAssociatied: any) {
        if (!userInfoAssociatied || Object.keys(userInfoAssociatied).length < 1) { return undefined }
        let associatedAgent = new Agent()
        associatedAgent.info = userInfoAssociatied
        associatedAgent.name = userInfoAssociatied['name']
        let userByID = await Utilities.findUserById(userInfoAssociatied['id'])
        if (userByID) {
            associatedAgent.id = userByID.id
            associatedAgent.associated_type = userByID.type
            associatedAgent.name = userByID.name
            associatedAgent.info = userByID.toJSON(true)
        } else {
            associatedAgent.id = userInfoAssociatied['id']
        }
        return associatedAgent
    }


    public checkingIfPortalUser(user: User) {
        let userTypeAttribute = user.attributes.find(att => att.name === 'user_type');
        let userType = userTypeAttribute ? userTypeAttribute.value : undefined
        return (!userTypeAttribute.expired) && userType === 'portal_user'
    }

    public checkingIfCasualUser(user: User) {
        let userTypeAttribute = user.attributes.find(att => att.name === 'user_type');
        let userType = userTypeAttribute ? userTypeAttribute.value : undefined
        return (!userTypeAttribute.expired) && userType === 'casual_user'
    }

    public async onUpdatedChapterComponent(currentSender: User, userInfoAssociatied: any, currentDataset: T, datasetInfo: any, detailDifference: any) {
        let chapter = await this.onCreateAgentsAndEntity(currentSender, userInfoAssociatied, currentDataset, datasetInfo)
        let activitity = this.createActivityWithName(`update_${currentDataset.type}`)
        activitity.info = detailDifference
        chapter.activities = [activitity]
        return chapter
    }

    public async updateProvenanceInfo(updatedEntity: T, currentSender: User, entityInfo: any, detailDifference: any, oldValue: T) {
        let lstDataProvenance = await DataProvenance.query(DataProvenance, {
            "selector": {
                type: new DataProvenance().type,
                associated_with_obj_id: updatedEntity.id,
                object_type: updatedEntity.type
            }
        }) as DataProvenance[]

        if (lstDataProvenance.length !== 1) {
            throw new Error(`Cannot find story related to this ${updatedEntity.type} ` + updatedEntity['id'] + 'from ' + updatedEntity['source'])
        }
        let currentDataProvenance = lstDataProvenance[0]
        let userInfoAssociatied = { ...entityInfo['user'] }
        // manually remove user info
        delete entityInfo["user"]

        if (Object.keys(userInfoAssociatied).length < 1 && updatedEntity['creator_user_id']) {
            userInfoAssociatied = {
                id: updatedEntity['creator_user_id']
            }
        }

        let newChapter = await this.onUpdatedChapterComponent(currentSender, userInfoAssociatied, updatedEntity, entityInfo, detailDifference)
        // create provenance info
        let wasGeneratedBy_info = new WasGeneratedBy()
        console.log('===== wasGeneratedBy_info entity', newChapter.entities[0])
        wasGeneratedBy_info.entity = ProvenananeGenerator.getProvName(newChapter.entities[0])
        wasGeneratedBy_info.activity = ProvenananeGenerator.getProvName(newChapter.activities[0])
        newChapter.provenanceInfo = [wasGeneratedBy_info]

        let isHaveUserAssociated: boolean = newChapter.agents.length > 1
        let wasAttributedTo_info = new WasAttributedTo()
        wasAttributedTo_info.entity = ProvenananeGenerator.getProvName(newChapter.entities[0])
        wasAttributedTo_info.agent = isHaveUserAssociated ? ProvenananeGenerator.getProvName(newChapter.agents[1]) : ProvenananeGenerator.getProvName(newChapter.agents[0])
        newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAttributedTo_info)

        if (isHaveUserAssociated) {
            let wasAssociatedWith_info = new WasAssociatedWith()
            wasAssociatedWith_info.agent = ProvenananeGenerator.getProvName(newChapter.agents[0])
            wasAssociatedWith_info.activity = ProvenananeGenerator.getProvName(newChapter.activities[0])
            newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAssociatedWith_info)

            let actedOnBehalfOf_info = new ActedOnBehalfOf()
            actedOnBehalfOf_info.delegate = ProvenananeGenerator.getProvName(newChapter.agents[0])
            actedOnBehalfOf_info.responsible = ProvenananeGenerator.getProvName(newChapter.agents[1])
            newChapter.provenanceInfo = newChapter.provenanceInfo.concat(actedOnBehalfOf_info)
        }
        // create revision of
        let wasDerivedFrom = new WasDerivedFrom()

        wasDerivedFrom.generatedEntity = ProvenananeGenerator.getProvName(newChapter.entities[0])
        // find latest entity have same id
        wasDerivedFrom.usedEntity = ProvenananeGenerator.generateDatasetHashName(oldValue.toJSON(true))
        newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasDerivedFrom)
        currentDataProvenance.story = currentDataProvenance.story.concat(newChapter)
        return await currentDataProvenance.save()
    }
}
