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

export abstract class BaseController<T extends BaseModel<T>> extends ConvectorController<ChaincodeTx> {

    async create(modelInfo: any): Promise<T> {
        let currentSender = await this.validateCurrentSender()
        let savedModel = await this.onCreate(modelInfo, currentSender)
        let provInfo = await this.onCreateProv(currentSender, savedModel, modelInfo)
        return <T>savedModel.toJSON()
    }

    abstract async onCreate(modelInfo: any, sender: User): Promise<T>

    abstract async onCreateProv(currentSender: User, currentEntity: T, dataInfo: any)


    public async provenanceInfo_create(newValue: T, currentSender: User, info: any) {
        
        let userInfoAssociatied = { ...info['user'] }
        // manually remove user info
        delete info["user"]
        let newChapter = await this.chapter_createNew(currentSender, userInfoAssociatied, newValue, info)
        // create provenance info
        let wasGeneratedBy_info = new WasGeneratedBy()
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

        let datasetProvenance = new DataProvenance()
        datasetProvenance.associated_with_obj_id = newValue.id
        datasetProvenance.object_type = newValue.type
        datasetProvenance.story = [newChapter]
        datasetProvenance.id = this.tx.stub.generateUUID(`${currentSender.type}provenance-${datasetProvenance.associated_with_obj_id}-${datasetProvenance.object_type}`)
        return await datasetProvenance.save()
    }
    public createActivityWithName(name: string) {
        let activitity = new Activity()
        activitity.name = name
        return activitity
    }
    public createRelatedEntity(entityRelated: T, datasetInfo: any) {
        let entity = new Entity()
        entity.associated_type = entityRelated.type
        entity.info = entityRelated.toJSON()
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
        currentSender_Agent.info = currentSender.toJSON()
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
            associatedAgent.info = userByID.toJSON()
        } else {
            associatedAgent.id = userInfoAssociatied['id']
        }
        return associatedAgent
    }
    public async validateCurrentSender() {
        // make sure current sender is valid user 
        let listUserBySender = await User.query(User, {
            "selector": {
                "type": new User().type,
                "identities.0.fingerprint": this.sender,
                "identities.0.status": true
            }
        }) as User[]
        if (!listUserBySender || listUserBySender.length !== 1) {
            throw new Error('There is no valid or active credential available with current sender')
        }
        return listUserBySender[0]
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

    public async updateProvenanceInfo(updatedEntity: T, currentSender: User, entityInfo: any, detailDifference: any, oldValue: any) {
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
        wasDerivedFrom.usedEntity = ProvenananeGenerator.generateDatasetHashName(oldValue)

        newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasDerivedFrom)
        currentDataProvenance.story = currentDataProvenance.story.concat(newChapter)
        return await currentDataProvenance.save()
    }
}
