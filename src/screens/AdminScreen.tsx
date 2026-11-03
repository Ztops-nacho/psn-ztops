import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type Section = "resumen" | "productos" | "clientes" | "pedidos" | "compras" | "cobranzas" | "usuarios";
type Producto = { id:number; sku:string; nombre:string; precio:number; stock:number; unidadMedida?:string; activo:boolean };
type Cliente = { id:number; codigo:string; razonSocial:string; nombreComercial?:string; activo:boolean };
type Pedido = { id:number; numeroPedido:string; fecha:string; estado:string; total:number; cliente?:Cliente; vendedor?:{ codigo:string; nombres:string; apellidos:string } };
type Rol = { id:number; nombre:string };
type Usuario = { id:number; username:string; activo:boolean; roles:Rol[]; vendedor?:{ nombres:string; apellidos:string } };
type Compra = { id:number; cantidad:number; stockAnterior:number; stockNuevo:number; observacion?:string; fechaCreacion:string; producto:Producto };
type Cuenta = { id:number; monto:number; saldo:number; estado:string; fechaVencimiento:string; cliente:Cliente; pedido:Pedido; pagos:{id:number;monto:number;medio:string;fecha:string}[] };

const money = new Intl.NumberFormat("es-PE", { style:"currency", currency:"PEN" });

export function AdminScreen() {
  const { logout } = useAuth();
  const [section, setSection] = useState<Section>("resumen");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState(false);
  const [productForm, setProductForm] = useState({ sku:"", nombre:"", precio:"", stock:"", unidadMedida:"UND" });
  const [userForm, setUserForm] = useState({ username:"", password:"", roleId:"" });
  const [purchaseForm, setPurchaseForm] = useState({ productoId:"", cantidad:"", observacion:"" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, o, u, r, b, a] = await Promise.all([
        api.get<Producto[]>("/productos"), api.get<Cliente[]>("/clientes"),
        api.get<Pedido[]>("/pedidos"), api.get<Usuario[]>("/auth/usuarios"), api.get<Rol[]>("/auth/roles"),
        api.get<Compra[]>("/stock/movimientos/compras"),
        api.get<Cuenta[]>("/cobranzas"),
      ]);
      setProductos(p.data); setClientes(c.data); setPedidos(o.data); setUsuarios(u.data); setRoles(r.data); setCompras(b.data); setCuentas(a.data);
    } catch (error:any) {
      Alert.alert("No se pudo cargar el panel", error?.response?.data?.message ?? "Revisa los permisos del usuario administrador.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const sales = pedidos.filter(p => p.estado === "CONFIRMADO").reduce((sum,p) => sum + Number(p.total || 0), 0);
  const visibleProducts = useMemo(() => productos.filter(p => `${p.sku} ${p.nombre}`.toLowerCase().includes(query.toLowerCase())), [productos, query]);

  async function createProduct() {
    try {
      await api.post("/productos", { ...productForm, precio:Number(productForm.precio), stock:Number(productForm.stock) });
      setProductModal(false); setProductForm({ sku:"", nombre:"", precio:"", stock:"", unidadMedida:"UND" }); await load();
    } catch (e:any) { Alert.alert("No se pudo guardar", message(e)); }
  }
  async function toggleProduct(item:Producto) { await api.patch(`/productos/${item.id}`, { activo:!item.activo }); await load(); }
  async function createUser() {
    try {
      await api.post("/auth/usuarios", { username:userForm.username, password:userForm.password, roleIds:[Number(userForm.roleId)] });
      setUserModal(false); setUserForm({ username:"", password:"", roleId:"" }); await load();
    } catch (e:any) { Alert.alert("No se pudo crear", message(e)); }
  }
  async function toggleUser(item:Usuario) { await api.patch(`/auth/usuarios/${item.id}`, { activo:!item.activo }); await load(); }
  async function createPurchase() {
    const product = productos.find(p => p.id === Number(purchaseForm.productoId));
    const quantity = Number(purchaseForm.cantidad);
    if (!product || !Number.isFinite(quantity) || quantity <= 0)
      return Alert.alert("Datos incompletos", "Selecciona un producto e ingresa una cantidad mayor que cero.");
    try {
      await api.patch(`/stock/${product.id}`, {
        tipo:"ENTRADA",
        stockNuevo:Number(product.stock) + quantity,
        observacion:purchaseForm.observacion.trim() || "Compra de mercadería",
      });
      setPurchaseModal(false); setPurchaseForm({ productoId:"", cantidad:"", observacion:"" }); await load();
      Alert.alert("Stock actualizado", `Se agregaron ${quantity} unidades de ${product.nombre}.`);
    } catch (e:any) { Alert.alert("No se pudo registrar la compra", message(e)); }
  }
  async function registerPayment(cuenta:Cuenta) {
    const amount = Number(globalThis.prompt(`Saldo: ${money.format(cuenta.saldo)}\nMonto recibido:`));
    if (!Number.isFinite(amount) || amount <= 0) return;
    const medio = globalThis.prompt("Medio: EFECTIVO, TRANSFERENCIA, YAPE_PLIN o DEPOSITO", "EFECTIVO")?.trim().toUpperCase();
    if (!['EFECTIVO','TRANSFERENCIA','YAPE_PLIN','DEPOSITO'].includes(medio??'')) return Alert.alert('Medio inválido','Usa uno de los medios indicados.');
    const referencia = globalThis.prompt('Referencia (opcional):') || undefined;
    try { await api.post(`/cobranzas/${cuenta.id}/pagos`,{monto:amount,medio,referencia}); await load(); }
    catch(e:any){ Alert.alert('No se pudo registrar el pago',message(e)); }
  }
  async function confirmOrder(item: Pedido) {
    if (!globalThis.confirm(`¿Confirmar el pedido ${item.numeroPedido}?\n\nEsta acción descontará el stock.`)) return;
    try {
      await api.patch(`/pedidos/${item.id}/estado`, { estado:"CONFIRMADO" });
      await load();
      Alert.alert("Pedido confirmado", `${item.numeroPedido} fue confirmado correctamente.`);
    } catch (e:any) { Alert.alert("No se pudo confirmar", message(e)); }
  }
  function exportOrders() {
    const columns = ["Pedido","Fecha","Cliente","Código vendedor","Vendedor","Estado","Total"];
    const rows = pedidos.map(p => [
      p.numeroPedido,
      p.fecha ? new Date(p.fecha).toLocaleString("es-PE") : "",
      p.cliente?.nombreComercial || p.cliente?.razonSocial || "",
      p.vendedor?.codigo || "",
      p.vendedor ? `${p.vendedor.nombres} ${p.vendedor.apellidos}` : "",
      p.estado,
      Number(p.total || 0).toFixed(2),
    ]);
    const csv = [columns, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type:"text/csv;charset=utf-8" }));
    const link = globalThis.document.createElement("a");
    link.href = url; link.download = `pedidos-${new Date().toISOString().slice(0,10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  return <View style={s.page}>
    <View style={s.sidebar}>
      <View><Text style={s.brand}>ZT</Text><Text style={s.brandName}>ZTOPS</Text><Text style={s.brandSub}>ADMINISTRACIÓN</Text></View>
      <View style={s.menu}>{([['resumen','view-dashboard-outline','Resumen'],['productos','package-variant-closed','Productos'],['clientes','storefront-outline','Clientes'],['pedidos','clipboard-text-outline','Pedidos'],['compras','truck-delivery-outline','Compras'],['cobranzas','cash-check','Cobranzas'],['usuarios','account-group-outline','Usuarios']] as const).map(([id,icon,label]) =>
        <Pressable key={id} style={[s.menuItem, section===id && s.menuActive]} onPress={() => { setSection(id); setQuery(""); }}><MaterialCommunityIcons name={icon} size={21} color={section===id?'#fff':'#98a2b3'} /><Text style={[s.menuText,section===id&&s.menuTextActive]}>{label}</Text></Pressable>)}</View>
      <Pressable style={s.logout} onPress={logout}><MaterialCommunityIcons name="logout" size={20} color="#f97066"/><Text style={s.logoutText}>Cerrar sesión</Text></Pressable>
    </View>
    <View style={s.main}>
      <View style={s.top}><View><Text style={s.eyebrow}>PANEL ADMINISTRATIVO</Text><Text style={s.title}>{title(section)}</Text></View><Pressable style={s.refresh} onPress={() => void load()}><MaterialCommunityIcons name="refresh" size={21}/></Pressable></View>
      {loading ? <ActivityIndicator style={{flex:1}} size="large" color="#e3262e"/> : <ScrollView contentContainerStyle={s.content}>
        {section==='resumen' && <><View style={s.metrics}><Metric icon="cash-multiple" label="Ventas confirmadas" value={money.format(sales)} tone="#e3262e"/><Metric icon="clipboard-check-outline" label="Pedidos" value={String(pedidos.length)} tone="#2864dc"/><Metric icon="storefront-outline" label="Clientes" value={String(clientes.length)} tone="#12a474"/><Metric icon="package-variant" label="Productos activos" value={String(productos.filter(p=>p.activo).length)} tone="#7a5af8"/></View><Panel title="Pedidos recientes" action={<ExportButton onPress={exportOrders}/>}><OrderRows items={pedidos.slice(0,8)} onConfirm={confirmOrder}/></Panel></>}
        {section==='productos' && <Panel title="Catálogo" action={<Add label="Nuevo producto" onPress={()=>setProductModal(true)}/>}><Search value={query} onChange={setQuery}/><Header cells={['SKU','Producto','Precio','Stock','Estado','Acción']}/>{visibleProducts.map(p=><Row key={p.id} cells={[p.sku,p.nombre,money.format(p.precio),String(p.stock),p.activo?'Activo':'Inactivo']} action={<Toggle active={p.activo} onPress={()=>void toggleProduct(p)}/>} />)}</Panel>}
        {section==='clientes' && <Panel title="Clientes"><Header cells={['Código','Razón social','Nombre comercial','Estado']}/>{clientes.map(c=><Row key={c.id} cells={[c.codigo,c.razonSocial,c.nombreComercial||'—',c.activo?'Activo':'Inactivo']}/>)}</Panel>}
        {section==='pedidos' && <Panel title="Pedidos" action={<ExportButton onPress={exportOrders}/>}><OrderRows items={pedidos} onConfirm={confirmOrder}/></Panel>}
        {section==='compras' && <Panel title="Compras e ingresos de stock" action={<Add label="Registrar compra" onPress={()=>setPurchaseModal(true)}/>}><Header cells={['Fecha','SKU','Producto','Cantidad','Stock anterior','Stock nuevo','Observación']}/>{compras.map(c=><Row key={c.id} cells={[new Date(c.fechaCreacion).toLocaleString('es-PE'),c.producto.sku,c.producto.nombre,String(c.cantidad),String(c.stockAnterior),String(c.stockNuevo),c.observacion||'—']}/>)}</Panel>}
        {section==='cobranzas' && <Panel title="Cuentas por cobrar"><Header cells={['Pedido','Cliente','Vencimiento','Importe','Saldo','Estado','Acción']}/>{cuentas.map(c=><Row key={c.id} cells={[c.pedido.numeroPedido,c.cliente.nombreComercial||c.cliente.razonSocial,new Date(c.fechaVencimiento).toLocaleDateString('es-PE'),money.format(c.monto),money.format(c.saldo),c.estado]} action={c.saldo>0?<ConfirmButton onPress={()=>void registerPayment(c)}/>:<Text style={{color:'#079455'}}>Pagada</Text>}/>)}</Panel>}
        {section==='usuarios' && <Panel title="Usuarios y roles" action={<Add label="Nuevo usuario" onPress={()=>setUserModal(true)}/>}><Header cells={['Usuario','Vendedor','Roles','Estado','Acción']}/>{usuarios.map(u=><Row key={u.id} cells={[u.username,u.vendedor?`${u.vendedor.nombres} ${u.vendedor.apellidos}`:'Sin asignar',u.roles.map(r=>r.nombre).join(', '),u.activo?'Activo':'Inactivo']} action={<Toggle active={u.activo} onPress={()=>void toggleUser(u)}/>}/>)}</Panel>}
      </ScrollView>}
    </View>
    <FormModal visible={productModal} title="Nuevo producto" onClose={()=>setProductModal(false)} onSave={createProduct}><Field label="SKU" value={productForm.sku} onChange={(v:string)=>setProductForm({...productForm,sku:v})}/><Field label="Nombre" value={productForm.nombre} onChange={(v:string)=>setProductForm({...productForm,nombre:v})}/><Field label="Precio" value={productForm.precio} onChange={(v:string)=>setProductForm({...productForm,precio:v})}/><Field label="Stock inicial" value={productForm.stock} onChange={(v:string)=>setProductForm({...productForm,stock:v})}/></FormModal>
    <FormModal visible={userModal} title="Nuevo usuario" onClose={()=>setUserModal(false)} onSave={createUser}><Field label="Usuario" value={userForm.username} onChange={(v:string)=>setUserForm({...userForm,username:v})}/><Field label="Contraseña (mín. 10 caracteres)" value={userForm.password} secure onChange={(v:string)=>setUserForm({...userForm,password:v})}/><Text style={s.fieldLabel}>Rol</Text><View style={s.roleList}>{roles.map(r=><Pressable key={r.id} style={[s.role, userForm.roleId===String(r.id)&&s.roleOn]} onPress={()=>setUserForm({...userForm,roleId:String(r.id)})}><Text style={userForm.roleId===String(r.id)&&{color:'#fff'}}>{r.nombre}</Text></Pressable>)}</View></FormModal>
    <FormModal visible={purchaseModal} title="Registrar compra" onClose={()=>setPurchaseModal(false)} onSave={createPurchase}><Text style={s.fieldLabel}>Producto</Text><ScrollView style={{maxHeight:180,borderWidth:1,borderColor:'#d0d5dd',borderRadius:9,marginBottom:14,padding:6}}>{productos.filter(p=>p.activo).map(p=><Pressable key={p.id} style={[{padding:10,borderRadius:7,marginBottom:4},purchaseForm.productoId===String(p.id)&&{backgroundColor:'#101828'}]} onPress={()=>setPurchaseForm({...purchaseForm,productoId:String(p.id)})}><Text style={purchaseForm.productoId===String(p.id)&&{color:'#fff'}}>{p.sku} · {p.nombre} (stock: {p.stock})</Text></Pressable>)}</ScrollView><Field label="Cantidad comprada" value={purchaseForm.cantidad} onChange={(v:string)=>setPurchaseForm({...purchaseForm,cantidad:v})}/><Field label="Observación o referencia" value={purchaseForm.observacion} onChange={(v:string)=>setPurchaseForm({...purchaseForm,observacion:v})}/></FormModal>
  </View>;
}

function message(e:any){ const m=e?.response?.data?.message; return Array.isArray(m)?m.join('\n'):(m??'Inténtalo nuevamente.'); }
function title(s:Section){ return ({resumen:'Resumen ejecutivo',productos:'Productos',clientes:'Clientes',pedidos:'Pedidos',compras:'Compras y stock',cobranzas:'Cuentas por cobrar',usuarios:'Usuarios y roles'})[s]; }
function Metric({icon,label,value,tone}:any){return <View style={s.metric}><View style={[s.metricIcon,{backgroundColor:`${tone}18`}]}><MaterialCommunityIcons name={icon} size={25} color={tone}/></View><Text style={s.metricLabel}>{label}</Text><Text style={s.metricValue}>{value}</Text></View>}
function Panel({title,action,children}:any){return <View style={s.panel}><View style={s.panelTop}><Text style={s.panelTitle}>{title}</Text>{action}</View>{children}</View>}
function Search({value,onChange}:any){return <TextInput style={s.search} placeholder="Buscar por nombre o código" value={value} onChangeText={onChange}/>}
function Header({cells}:any){return <View style={[s.row,s.header]}>{cells.map((c:string)=><Text key={c} style={[s.cell,s.headerText]}>{c}</Text>)}</View>}
function Row({cells,action}:any){return <View style={s.row}>{cells.map((c:string,i:number)=><Text key={i} numberOfLines={1} style={s.cell}>{c}</Text>)}{action&&<View style={s.cell}>{action}</View>}</View>}
function OrderRows({items,onConfirm}:{items:Pedido[];onConfirm:(item:Pedido)=>void}){return <><Header cells={['Pedido','Cliente','Vendedor','Fecha','Estado','Total','Acción']}/>{items.map(p=><Row key={p.id} cells={[p.numeroPedido,p.cliente?.nombreComercial||p.cliente?.razonSocial||'—',p.vendedor?`${p.vendedor.nombres} ${p.vendedor.apellidos}`:'—',new Date(p.fecha).toLocaleDateString('es-PE'),p.estado,money.format(Number(p.total||0))]} action={p.estado==='BORRADOR'?<ConfirmButton onPress={()=>onConfirm(p)}/>:<Text style={{color:'#98a2b3'}}>Completado</Text>}/>)}</>}
function csvCell(value:unknown){return `"${String(value??'').replace(/"/g,'""')}"`;}
function ExportButton({onPress}:{onPress:()=>void}){return <Pressable style={s.export} onPress={onPress}><MaterialCommunityIcons name="download-outline" size={18} color="#344054"/><Text style={s.exportText}>Exportar pedidos</Text></Pressable>}
function ConfirmButton({onPress}:{onPress:()=>void}){return <Pressable style={s.confirmOrder} onPress={onPress}><Text style={s.confirmOrderText}>Confirmar</Text></Pressable>}
function Add({label,onPress}:any){return <Pressable style={s.add} onPress={onPress}><MaterialCommunityIcons name="plus" size={18} color="#fff"/><Text style={s.addText}>{label}</Text></Pressable>}
function Toggle({active,onPress}:any){return <Pressable onPress={onPress}><Text style={{color:active?'#d92d20':'#079455',fontWeight:'800'}}>{active?'Desactivar':'Activar'}</Text></Pressable>}
function Field({label,value,onChange,secure}:any){return <View style={{marginBottom:14}}><Text style={s.fieldLabel}>{label}</Text><TextInput style={s.input} value={value} secureTextEntry={secure} onChangeText={onChange}/></View>}
function FormModal({visible,title,onClose,onSave,children}:any){return <Modal transparent visible={visible} animationType="fade"><View style={s.overlay}><View style={s.modal}><Text style={s.modalTitle}>{title}</Text>{children}<View style={s.actions}><Pressable style={s.cancel} onPress={onClose}><Text>Cancelar</Text></Pressable><Pressable style={s.save} onPress={()=>void onSave()}><Text style={s.addText}>Guardar</Text></Pressable></View></View></View></Modal>}

const s=StyleSheet.create({page:{flex:1,flexDirection:'row',backgroundColor:'#f4f6f8'},sidebar:{width:238,backgroundColor:'#101828',padding:24},brand:{color:'#fff',fontSize:25,fontWeight:'900'},brandName:{color:'#fff',fontWeight:'900',fontSize:16},brandSub:{color:'#667085',fontSize:9,letterSpacing:1.4},menu:{marginTop:42,flex:1,gap:7},menuItem:{flexDirection:'row',alignItems:'center',gap:12,padding:13,borderRadius:11},menuActive:{backgroundColor:'#e3262e'},menuText:{color:'#98a2b3',fontWeight:'700'},menuTextActive:{color:'#fff'},logout:{flexDirection:'row',gap:10,padding:12},logoutText:{color:'#f97066',fontWeight:'700'},main:{flex:1},top:{height:96,backgroundColor:'#fff',paddingHorizontal:32,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#eaecf0'},eyebrow:{color:'#e3262e',fontSize:10,fontWeight:'900',letterSpacing:1.2},title:{fontSize:26,fontWeight:'900',color:'#101828'},refresh:{padding:11,borderWidth:1,borderColor:'#d0d5dd',borderRadius:10},content:{padding:28,gap:22},metrics:{flexDirection:'row',gap:16},metric:{flex:1,minWidth:170,backgroundColor:'#fff',borderRadius:16,padding:18,borderWidth:1,borderColor:'#eaecf0'},metricIcon:{width:45,height:45,borderRadius:12,alignItems:'center',justifyContent:'center'},metricLabel:{color:'#667085',fontSize:12,fontWeight:'700',marginTop:16},metricValue:{fontSize:24,fontWeight:'900',color:'#101828',marginTop:4},panel:{backgroundColor:'#fff',borderRadius:16,padding:20,borderWidth:1,borderColor:'#eaecf0'},panelTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},panelTitle:{fontSize:19,fontWeight:'900',color:'#101828'},add:{backgroundColor:'#e3262e',paddingHorizontal:14,paddingVertical:10,borderRadius:9,flexDirection:'row',gap:6},addText:{color:'#fff',fontWeight:'800'},export:{paddingHorizontal:13,paddingVertical:9,borderRadius:9,borderWidth:1,borderColor:'#d0d5dd',flexDirection:'row',alignItems:'center',gap:6},exportText:{color:'#344054',fontWeight:'800'},confirmOrder:{backgroundColor:'#079455',paddingHorizontal:10,paddingVertical:7,borderRadius:8,alignSelf:'flex-start'},confirmOrderText:{color:'#fff',fontSize:12,fontWeight:'900'},search:{borderWidth:1,borderColor:'#d0d5dd',borderRadius:10,padding:11,maxWidth:360,marginBottom:14},row:{flexDirection:'row',minHeight:49,alignItems:'center',borderBottomWidth:1,borderBottomColor:'#eaecf0'},header:{backgroundColor:'#f9fafb',minHeight:42},cell:{flex:1,color:'#344054',paddingHorizontal:10,fontSize:13},headerText:{color:'#667085',fontSize:11,fontWeight:'800',textTransform:'uppercase'},overlay:{flex:1,backgroundColor:'#10182899',alignItems:'center',justifyContent:'center'},modal:{width:460,maxWidth:'92%',backgroundColor:'#fff',padding:24,borderRadius:18},modalTitle:{fontSize:22,fontWeight:'900',marginBottom:20},fieldLabel:{fontWeight:'700',color:'#344054',marginBottom:6},input:{borderWidth:1,borderColor:'#d0d5dd',borderRadius:9,padding:11},actions:{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:22},cancel:{paddingHorizontal:18,paddingVertical:12,borderWidth:1,borderColor:'#d0d5dd',borderRadius:9},save:{paddingHorizontal:20,paddingVertical:12,backgroundColor:'#e3262e',borderRadius:9},roleList:{flexDirection:'row',gap:8},role:{borderWidth:1,borderColor:'#d0d5dd',paddingHorizontal:13,paddingVertical:9,borderRadius:9},roleOn:{backgroundColor:'#101828'}});
