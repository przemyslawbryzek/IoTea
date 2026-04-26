import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getTeaById, getMyTeaById, getDevices, startBrew } from '../services/api';
import type { Tea } from '../interfaces/tea.interface';
import type { MyTeaDetail } from '../interfaces/mytea.interface';
import type { DeviceSummary } from '../interfaces/device.interface';

type TeaPageInstruction = {
    id: number;
    style: { name: string };
    grams_per_100ml: number;
    first_infusion_seconds: number;
    increment_seconds: number;
    max_infusions: number;
};

type TeaPageTea = {
    id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    categoryId: number;
    brew_temp: number;
    category: {
        id: number;
        name: string;
        icon_url?: string | null;
    };
    source?: 'base' | 'user';
    instructions?: TeaPageInstruction[];
};

export function TeaPage() {
    const { id, source } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [tea, setTea] = useState<TeaPageTea | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [devices, setDevices] = useState<DeviceSummary[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
    const [selectedInstruction, setSelectedInstruction] = useState<TeaPageInstruction | null>(null);
    const [waterAmount, setWaterAmount] = useState<number>(250);
    const [brewNumber, setBrewNumber] = useState<number>(1);
    const [isBrewing, setIsBrewing] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (id) {
                    const teaData: Tea | MyTeaDetail = source === 'user'
                        ? await getMyTeaById(Number(id))
                        : await getTeaById(Number(id));

                    const normalizedTea: TeaPageTea = {
                        id: teaData.id,
                        name: teaData.name,
                        description: teaData.description,
                        image_url: teaData.image_url,
                        categoryId: teaData.categoryId,
                        brew_temp: teaData.brew_temp,
                        category: teaData.category,
                        source: (teaData as Tea).source ?? (source === 'user' ? 'user' : 'base'),
                        instructions: (teaData.instructions ?? []).map((instruction) => ({
                            id: instruction.id,
                            style: { name: instruction.style.name },
                            grams_per_100ml: Number(instruction.grams_per_100ml),
                            first_infusion_seconds: instruction.first_infusion_seconds,
                            increment_seconds: instruction.increment_seconds,
                            max_infusions: instruction.max_infusions,
                        })),
                    };

                    setTea(normalizedTea);
                    if (teaData.instructions && teaData.instructions.length > 0) {
                        setSelectedInstruction(normalizedTea.instructions?.[0] ?? null);
                    } else {
                        setSelectedInstruction(null);
                    }

                    const requestedBrewNumber = Number(searchParams.get('brewNumber') || '1');
                    setBrewNumber(Number.isFinite(requestedBrewNumber) && requestedBrewNumber > 0 ? requestedBrewNumber : 1);
                }
                const devicesData = await getDevices();
                const onlineDevices = devicesData.filter((device) => device.online);
                setDevices(onlineDevices);
                if (onlineDevices.length > 0) {
                    setSelectedDevice(onlineDevices[0].id);
                } else {
                    setSelectedDevice(null);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [id, source, searchParams]);

    useEffect(() => {
        if (!selectedInstruction) return;
        setBrewNumber((prev) => Math.min(Math.max(prev, 1), selectedInstruction.max_infusions));
    }, [selectedInstruction]);

    const teaAmount = selectedInstruction 
        ? (waterAmount * selectedInstruction.grams_per_100ml) / 100 
        : 0;

    const handleStartBrew = async () => {
        if (!selectedDevice || !selectedInstruction) return;
        
        try {
            setIsBrewing(true);
            const brew = await startBrew({
                deviceId: selectedDevice,
                instructionId: selectedInstruction.id,
                volumeMl: waterAmount,
                brewNumber: brewNumber,
            });
            navigate(`/brew/${brew.id}`);
            setBrewNumber((prev) => prev + 1);
        } catch (error) {
            console.error('Error starting brew:', error);
        } finally {
            setIsBrewing(false);
        }
    };
    return (
        <main className="min-h-app">
            <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
                <div className="flex flex-row items-center gap-2 mb-4">
                    <Link to={source === 'user' ? '/myteas' : '/'} className="text-sm text-black/50 mb-4">
                        {source === 'user' ? 'My Teas' : 'Teas'}
                    </Link>
                    <p className="text-sm text-black/50 mb-4">/{tea?.category?.name}</p>
                    <p className="text-sm text-black/50 mb-4">/{tea?.name}</p>
                </div>
                <div className="relative">
                    <img 
                        src={tea?.image_url || "https://images.unsplash.com/photo-1602943543714-cf535b048440?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmVlbiUyMHRlYSUyMGxlYXZlc3xlbnwxfHx8fDE3NzMyMTk0NzJ8MA&ixlib=rb-4.1.0&q=80&w=1080"} 
                        alt={tea?.name} 
                        className="mx-auto h-32 w-full object-cover rounded-2xl" 
                    />
                    <img
                        src={tea?.category?.icon_url || "https://img.icons8.com/?size=100&id=rCUgZeMLbaAM&format=png&color=000000"}
                        alt={tea?.category?.name}
                        className="p-2 size-10 absolute top-1/2 -translate-y-1/2 left-5 rounded-full border border-white bg-white z-10"
                    />
                    <button onClick={() => setShowModal(true)}>
                        <img
                            src="https://img.icons8.com/?size=100&id=sYKZOhn95Ako&format=png&color=000000"
                            alt="Info icon"
                            className="p-2 size-10 absolute top-1/2 -translate-y-1/2 right-5 rounded-full border border-white bg-white hover:bg-gray-100 z-10"
                        />
                    </button>
                </div>
                <h1 className="mt-2 text-3xl font-bold text-black">{tea?.name}</h1>
                <div className="mt-8 w-full">
                    <p className="text-xs uppercase tracking-[0.35em] text-black/50 mb-4">Brew</p>
                    
                    <div className="rounded p-5">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                            <label className="block text-xs uppercase tracking-[0.15em] text-black/50 mb-2">
                                Device
                            </label>
                            <select
                                value={selectedDevice || ''}
                                onChange={(e) => setSelectedDevice(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-black/25 rounded text-sm outline-none focus:border-black/50"
                            >
                                <option value="">Select Device</option>
                                {devices.map((device) => (
                                    <option key={device.id} value={device.id}>
                                        {device.name}
                                    </option>
                                ))}
                            </select>
                            </div>

                            <div>
                            <label className="block text-xs uppercase tracking-[0.15em] text-black/50 mb-2">
                                Brew Style
                            </label>
                            <select
                                value={selectedInstruction?.id || ''}
                                onChange={(e) => {
                                    const instruction = tea?.instructions?.find(
                                        (i) => i.id === Number(e.target.value)
                                    );
                                    setSelectedInstruction(instruction || null);
                                }}
                                className="w-full px-4 py-2 border border-black/25 rounded text-sm outline-none focus:border-black/50"
                            >
                                <option value="">Select Brew Style</option>
                                {tea?.instructions?.map((instruction) => (
                                    <option key={instruction.id} value={instruction.id}>
                                        {instruction.style.name}
                                    </option>
                                ))}
                            </select>
                            </div>

                            <div>
                                <div className="flex justify-between items-baseline">
                                <label className="text-xs uppercase tracking-[0.15em] text-black/50">
                                    Water Amount
                                </label>
                                <span className="text-sm font-medium text-black">{waterAmount}ml</span>
                                </div>
                                <input
                                type="range"
                                min="50"
                                max="500"
                                step="10"
                                value={waterAmount}
                                onChange={(e) => setWaterAmount(Number(e.target.value))}
                                className="w-full mt-2 accent-[#fe7600]"
                                />
                                <div className="flex justify-between text-xs text-black/50 mt-1">
                                <span>50ml</span>
                                <span>500ml</span>
                                </div>
                            </div>

                            <div>
                            <label className="block text-xs uppercase tracking-[0.15em] text-black/50 mb-2">
                                Brew Number
                            </label>
                            <input
                                type="number"
                                min="1"
                                max={selectedInstruction?.max_infusions || 10}
                                value={brewNumber}
                                onChange={(e) => setBrewNumber(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-black/25 rounded text-sm outline-none focus:border-black/50"
                            />
                            </div>

                            <div className="border border-black/25 rounded p-3">
                                {selectedInstruction ? (
                                    <>
                                        <p className="text-xs text-black/70">
                                            Prepare amount: <span className="font-medium text-black">{teaAmount.toFixed(1)}g</span>
                                        </p>
                                        <p className="text-xs text-black/50 mt-1">
                                            ({selectedInstruction.grams_per_100ml}g per 100ml)
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-xs text-black/50">Select brew style to calculate amount.</p>
                                )}
                            </div>

                            <div className="border border-black/25 rounded p-3">
                                <p className="text-xs uppercase tracking-[0.15em] text-black/50 mb-2">Instructions</p>
                                {selectedInstruction ? (
                                    <ul className="text-xs text-black/70 space-y-1">
                                        <li>First Brew: <span className="font-medium text-black">{selectedInstruction.first_infusion_seconds}s</span></li>
                                        <li>Increment: <span className="font-medium text-black">+{selectedInstruction.increment_seconds}s</span> per infusion</li>
                                        <li>Max Infusions: <span className="font-medium text-black">{selectedInstruction.max_infusions}</span></li>
                                    </ul>
                                ) : (
                                    <p className="text-xs text-black/50">Select brew style to see instructions.</p>
                                )}
                            </div>
                        </div>

                        <div className="mt-3 w-full flex flex-row justify-center">
                            <button
                                onClick={handleStartBrew}
                                disabled={!selectedDevice || !selectedInstruction || isBrewing}
                                className={`py-2 px-4 rounded text-sm font-medium transition-all ${
                                    isBrewing
                                        ? 'text-[#FFFBEF] bg-[#51961f] cursor-not-allowed'
                                        : selectedDevice && selectedInstruction
                                        ? 'text-[#FFFBEF] bg-[#51961f] hover:bg-[#51961f]/90 active:scale-98'
                                        : 'text-[#FFFBEF] bg-[#51961f] cursor-not-allowed'
                                }`}
                            >
                                Start Brew
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                        <h2 className="text-2xl font-bold text-black mb-4">{tea?.name}</h2>
                        <p className="text-gray-700 text-base leading-relaxed">{tea?.description}</p>
                    </div>
                </div>
            )}
        </main>
    );
}