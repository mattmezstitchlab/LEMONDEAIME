import {afterEach,expect,it,vi} from "vitest";
import {readInterfaceLevel,INTERFACE_LEVEL_KEY} from "../lib/interfaceLevel";
afterEach(()=>{vi.restoreAllMocks();localStorage.clear()});
it("préserve le niveau courant par défaut et relit chaque préférence",()=>{
 expect(readInterfaceLevel()).toBe("intermediate");
 for(const level of ["beginner","intermediate","expert"]){localStorage.setItem(INTERFACE_LEVEL_KEY,level);expect(readInterfaceLevel()).toBe(level)}
 localStorage.setItem(INTERFACE_LEVEL_KEY,"inconnu");expect(readInterfaceLevel()).toBe("intermediate");
});
it("reste utilisable si le stockage navigateur est inaccessible",()=>{
 vi.spyOn(Storage.prototype,"getItem").mockImplementation(()=>{throw Error("denied")});
 expect(readInterfaceLevel()).toBe("intermediate");
});
