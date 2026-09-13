import { useCallback, useState } from 'react'
import { pb } from '../lib/pbClient'

export interface Department {
  id: string
  hospital: string
  name: string
}

export interface Hospital {
  id: string
  name: string
  departments: Department[]
}

export function useHospitals() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHospitals = useCallback(async () => {
    setLoading(true)
    const [hData, dData] = await Promise.all([
      pb.collection('hospitals').getFullList({ sort: 'name' }),
      pb.collection('departments').getFullList({ sort: 'name' }),
    ])
    const depts = dData as unknown as Department[]
    const list = hData.map(h => ({
      id: h.id,
      name: h.name as string,
      departments: depts.filter(d => d.hospital === h.id),
    }))
    setHospitals(list)
    setLoading(false)
  }, [])

  const updateHospital = useCallback(async (id: string, name: string) => {
    await pb.collection('hospitals').update(id, { name })
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h))
  }, [])

  const addDepartment = useCallback(async (hospitalId: string, name: string) => {
    const data = await pb.collection('departments').create({ hospital: hospitalId, name })
    const dept: Department = { id: data.id, hospital: hospitalId, name: data.name as string }
    setHospitals(prev => prev.map(h =>
      h.id === hospitalId ? { ...h, departments: [...h.departments, dept] } : h
    ))
  }, [])

  const deleteDepartment = useCallback(async (deptId: string, hospitalId: string) => {
    await pb.collection('departments').delete(deptId)
    setHospitals(prev => prev.map(h =>
      h.id === hospitalId ? { ...h, departments: h.departments.filter(d => d.id !== deptId) } : h
    ))
  }, [])

  return { hospitals, loading, fetchHospitals, updateHospital, addDepartment, deleteDepartment }
}
