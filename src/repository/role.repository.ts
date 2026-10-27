import { Op } from 'sequelize';

import Role from '../db/models/role.model';
import BaseRepository from './base.repository';

class RoleRepository extends BaseRepository<Role> {
    constructor(){
        super(Role);
    }

    async getRoles(role : string){
        const record = await this.model.findAll({
            where:{
                name:{
                    [Op.like]: role+'%'
                }
            },
            attributes: ['name', 'id']
        });
                
        return record;
    }

    
    // Fetch a role using its exact name.
    async getRoleByExactName(roleName: string) {
        const record = await this.model.findOne({
            where: {
                name: roleName,
            },
            attributes: ['name', 'id'],
        });

        return record;
    }


}

export default RoleRepository;