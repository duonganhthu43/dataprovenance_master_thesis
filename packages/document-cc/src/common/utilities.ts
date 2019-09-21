import { User } from '../user/user.model'
import diffJson from 'diff-json'
var changesets = require('diff-json');
export class Utilities {
    public static async findUserById(userID) {
        if(!userID) return undefined
        let lstUserById = await User.query(User, {
            "selector": {
                "type": new User().type,
                "id": userID,
            }
        }) as User[]
        if (!lstUserById || lstUserById.length !== 1) {
           return undefined
        }
        return lstUserById[0]
    }

    public static findDiff( oldJson, newJson, definitionDiff) {
        return changesets.diff(oldJson, newJson, definitionDiff);
    }
}