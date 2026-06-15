import keytar from 'keytar'

const SERVICE = 'com.smitpandya.veexa'
const sshAccount = (id: string) => `${id}::ssh`

export const credentials = {
  setDbPassword: (id: string, password: string) => keytar.setPassword(SERVICE, id, password),
  getDbPassword: (id: string) => keytar.getPassword(SERVICE, id),
  deleteDbPassword: (id: string) => keytar.deletePassword(SERVICE, id),

  setSshSecret: (id: string, secret: string) => keytar.setPassword(SERVICE, sshAccount(id), secret),
  getSshSecret: (id: string) => keytar.getPassword(SERVICE, sshAccount(id)),
  deleteSshSecret: (id: string) => keytar.deletePassword(SERVICE, sshAccount(id))
}
