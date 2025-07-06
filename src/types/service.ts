export interface BaseResource {
  id: string
  name: string
  type: string
}

export interface Vpc extends BaseResource {
  type: 'vpc'
}

export interface Subnet extends BaseResource {
  vpcId: string
  isDefault: boolean
  type: string
}

export interface NetworkResource extends BaseResource {
  vpcId: string
  type: string
}

export interface ComputeResource extends BaseResource {
  vpcId: string
  subnetId: string
  type: string
}

export interface DatabaseResource extends BaseResource {
  vpcId: string
  subnetId: string
  type: string
}

export interface VpcResource {
  vpcId: string
  vpc: Vpc
  subnets: Subnet[]
  networks: NetworkResource[]
  computes: ComputeResource[]
  databases: DatabaseResource[]
}
